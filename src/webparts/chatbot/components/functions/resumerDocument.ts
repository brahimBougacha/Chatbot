import { SPHttpClient } from '@microsoft/sp-http';
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import mammoth from "mammoth";
import getChatResponse from '../../../../services/ChatService';
import { getDocumentsBibliotheque } from './getDocumentsBibliotheque';
import { getEntityTypeFromList } from './getEntityType';

pdfjsLib.GlobalWorkerOptions.workerSrc ="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

export async function resumerDocument(context: any, docName: string): Promise<string> {

  const fileUrl = `${context.pageContext.web.absoluteUrl}/_api/web/GetFileByServerRelativeUrl('/sites/SPFxTest/Shared Documents/${docName}')/$value`;
  const ext = docName.split('.').pop()?.toLowerCase();

  let rawText: string;
  try {
    const res = await context.spHttpClient.get(fileUrl, SPHttpClient.configurations.v1, {
      headers: { "Accept" : ext === 'pdf' ? 'application/pdf' : 'application/octet-stream', },
    });
    
    if (res.status === 404) {
      const docs = await getDocumentsBibliotheque(context);
      return `Le document **${docName}** n'existe pas dans la bibliothèque.\n\n${docs}`;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
     
    if (ext === 'pdf') {
      const arrayBuffer = await res.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText +=
          content.items.map((it: any) => it.str).join(' ') + '\n';
      }
      rawText = fullText;
    } else if (ext === 'docx') {
      const arrayBuffer = await res.arrayBuffer();
      const { value: text } = await mammoth.extractRawText({
        arrayBuffer,
      });
      rawText = text;
    } else if (ext === 'txt') {
      rawText = await res.text();
    } else {
      return `Format **.${ext}** non pris en charge pour le résumé.`;
    }
   
    const systemPrompt = {
      role: "system",
      content: "Vous êtes un résumé automatique. Résumez de façon claire et concise le texte fourni."
    };
    
    const userPrompt = {
      role: "user",
      content: `Résumé du document **${docName}**:\n\n${rawText}`
    };
    const { content: summary } = await getChatResponse([systemPrompt, userPrompt]);
    
    const entityType = await getEntityTypeFromList(context, 'ResumerDoc');
    const payload = {
      "@odata.type": entityType,
      Title: `Résumé - ${docName}`,
      DocName: docName,
      Resumer: summary.trim()
    };
     const saveRes = await context.spHttpClient.post(
      `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('ResumerDoc')/items`,
      SPHttpClient.configurations.v1,
      {
        headers: {
          "Accept": "application/json;odata.metadata=minimal",
          "Content-Type": "application/json;odata.metadata=minimal"
          
        },
        body: JSON.stringify(payload)
      }
    );
    if (!saveRes.ok) {
      const text = await saveRes.text();
      throw new Error(`Erreur enregistrement résumé : ${text}`);
    }

    return `📄 Résumé du document **${docName}** :\n${summary.trim()}`;
  } catch (err: any) {
    console.error("Erreur resumerDocument:", err);
    return `Impossible de résumer "${docName}" : ${err.message}`;
  }
}