import { SPHttpClient } from '@microsoft/sp-http';
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import mammoth from "mammoth";
import getChatResponse from '../../../../services/ChatService';
import { getDocumentsBibliotheque } from './getDocumentsBibliotheque';

pdfjsLib.GlobalWorkerOptions.workerSrc ="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

async function extraireTexte(context: any, docName: string): Promise<string> {
  const fileUrl = `${context.pageContext.web.absoluteUrl}/_api/web/GetFileByServerRelativeUrl('/sites/SPFxTest/Shared Documents/${docName}')/$value`;
  const ext = docName.split('.').pop()?.toLowerCase();

  const res = await context.spHttpClient.get(fileUrl, SPHttpClient.configurations.v1, {
    headers: { Accept: ext === 'pdf' ? 'application/pdf' : 'application/octet-stream' }
  });
  if (res.status === 404) {
      const docs = await getDocumentsBibliotheque(context);
      return `Le document **${docName}** n'existe pas dans la bibliothèque.\n\n${docs}`;
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const arrayBuffer = await res.arrayBuffer();

  if (ext === 'pdf') {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((it: any) => it.str).join(' ') + '\n';
    }
    return fullText;
  } else if (ext === 'docx') {
    const { value: text } = await mammoth.extractRawText({ arrayBuffer });
    return text;
  } else if (ext === 'txt') {
    return new TextDecoder().decode(arrayBuffer);
  } else {
    throw new Error(`Format .${ext} non pris en charge.`);
  }
}

export async function interrogerDocument(context: any, docName: string, question: string): Promise<string> {
  try {
    const contenu = await extraireTexte(context, docName);

    const systemPrompt = {
      role: "system",
      content:
        "Tu es un assistant intelligent. Réponds à la question de l'utilisateur en te basant uniquement sur le contenu du document fourni. Si la réponse n'est pas présente dans le document, indique-le clairement."
    };

    const userPrompt = {
      role: "user",
      content: `Document: ${docName}\n\nContenu:\n${contenu}\n\nQuestion: ${question}`
    };

    const { content: reponse } = await getChatResponse([systemPrompt, userPrompt]);

    return `📄 Réponse basée sur **${docName}** :\n\n${reponse.trim()}`;
  } catch (err: any) {
    console.error("Erreur interrogerDocument:", err);
    return `❌ Impossible de répondre à propos de **${docName}** : ${err.message}`;
  }
}
