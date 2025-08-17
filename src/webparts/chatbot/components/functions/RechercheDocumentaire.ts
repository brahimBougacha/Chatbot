import { SPHttpClient } from "@microsoft/sp-http";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import * as mammoth from "mammoth";
const Papa = require("papaparse");

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

async function extraireTexteDepuisFichier(fileName: string, arrayBuffer: ArrayBuffer): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase();
  let fullText = "";

  if (ext === "pdf") {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((it: any) => it.str).join(" ") + "\n";
    }
  }

  else if (ext === "docx") {
    const { value } = await mammoth.extractRawText({ arrayBuffer }); 
    fullText = value;
  }

  else if (ext === "csv") {
    const csvText = new TextDecoder("utf-8").decode(arrayBuffer);
    const parsed = Papa.parse(csvText, { header: false });
    parsed.data.forEach((row: any) => {
      fullText += row.join(" ") + "\n";
    });
  }
  else {
    throw new Error(`Format de fichier non supporté : ${ext}`);
  }

  return fullText.trim();
}

function extraireMotCle(question: string): string {
  return question
    .toLowerCase()
    .replace(/quel(le)? document (parle|contient|traite|porte) (la paragraphe|de|sur)?/i, "")
    .replace(/(le|la|les)\s+mot[s]?\s+/i, "")
    .replace(/^(ce|cette|cet)\s+paragraphe\s*:/i, "") 
    .replace(/^(ce|cette|cet)\s+phrase\s*:/i, "")    
    .replace(/^(ce|cette|cet)\s+texte\s*:/i, "")      
    .replace(/[\?\.\!]/g, "")
    .replace(/[()\[\]{}«»"']/g, "")
    .trim();
}

function nettoyerTextePourRecherche(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/[“”"']/g, "") // guillemets
    .replace(/\s+/g, " ")
    .replace(/[^\w\s<>\.\-]/g, " ") // remplace ponctuation non désirée par espace
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();  
}

function phraseExisteDansTexteParLigne(texte: string, phrase: string): boolean {
  const phraseNettoyee = nettoyerTextePourRecherche(phrase);
  if (!phraseNettoyee) return false;

  // split en lignes réelles (selon extraction pdf/docx/csv on ajoute \n entre pages/rows)
  const lines = texte.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = nettoyerTextePourRecherche(rawLine);
    if (line.length === 0) continue;
    
    if (line.includes(phraseNettoyee)) return true;

  }
  return false;
}
export async function rechercheDocumentaire(context: any, question: string): Promise<string> {
  try {
    // 1. Récupérer la liste des fichiers dans la bibliothèque "Documents"
    const listUrl = `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('Documents')/items?$select=FileLeafRef,FileRef&$top=50`;
    const listRes = await context.spHttpClient.get(listUrl, SPHttpClient.configurations.v1);
    const listJson = await listRes.json();

    if (!listJson.value || listJson.value.length === 0) {
      return "📂 Aucun document trouvé dans la bibliothèque.";
    }

    const motCle = extraireMotCle(question);
    const motCleNettoye = motCle ? motCle : "";
    if (!motCleNettoye) {
      return "❗ Mot-clé vide après nettoyage. Formule ta question différemment.";
    }

    let resultats: string[] = [];

    // 2. Parcourir chaque document
    for (const item of listJson.value) {
      const fileName = item.FileLeafRef;
      const fileUrl = `${context.pageContext.web.absoluteUrl}/_api/web/GetFileByServerRelativeUrl('${item.FileRef}')/$value`;

      try {
        // Télécharger le fichier en ArrayBuffer
        const fileRes = await context.spHttpClient.get(fileUrl, SPHttpClient.configurations.v1);
        if (!fileRes.ok) continue;

        const arrayBuffer = await fileRes.arrayBuffer();

        // Extraire le texte selon le format
        const texte = await extraireTexteDepuisFichier(fileName, arrayBuffer);

        // NOUVEAU : recherche de la phrase complète sur base "par ligne"
        const contientPhrase = phraseExisteDansTexteParLigne(texte, motCleNettoye);
        if (contientPhrase) {
          resultats.push(fileName);
        }

      } catch (err) {
        console.warn(`Erreur traitement fichier ${fileName}:`, err);
      }
    }

    // 4. Retourner la réponse
    if (resultats.length === 0) {
      return `🔍 Aucun document ne contient la phrase **${motCleNettoye}**.`;
    } else {
      return `🔍 Documents contenant **${motCleNettoye}** :\n- ${resultats.join("\n- ")}`;
    }

  } catch (err: any) {
    console.error("Erreur rechercheDocumentaire:", err);
    return `❌ Erreur lors de la recherche : ${err.message}`;
  }
}