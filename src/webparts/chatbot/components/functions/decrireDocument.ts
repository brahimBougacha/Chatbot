import { SPHttpClient } from '@microsoft/sp-http'; // pour faire des appel REST 
import getChatResponse from '../../../../services/ChatService';
import { getDocumentsBibliotheque } from './getDocumentsBibliotheque';

export async function decrireDocument(context: any, docName: string): Promise<string> {
  try {
    
    const metaUrl = `${context.pageContext.web.absoluteUrl}/_api/web/GetFileByServerRelativeUrl('/sites/SPFxTest/Shared Documents/${docName}')?$select=Name,Length,TimeCreated,TimeLastModified,Author/Title&$expand=Author`;
    const res = await context.spHttpClient.get(metaUrl, SPHttpClient.configurations.v1);
    
    if (res.status === 404) {
      const docs = await getDocumentsBibliotheque(context);
      return `Le document **${docName}** n'existe pas dans la bibliothèque.\n\n\n${docs}`;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const info = await res.json();
    const sys = {
      role: "system",
      content: "Vous êtes un assistant qui décrit un document SharePoint à partir de ses métadonnées."
    };
    const usr = {
        role: "user",
        content: `Fichier: ${info.Name}
        Taille (bytes): ${info.Length}
        Créé le: ${new Date(info.TimeCreated).toLocaleString()}
        Modifié le: ${new Date(info.TimeLastModified).toLocaleString()}
        Auteur: ${info.Author?.Title || "inconnu"}
        Donnez une description synthétique de ce document (format, usage possible, etc.).`
    };
    const { content: description } = await getChatResponse([sys, usr]);
    return `📄 Description du document **${docName}** :\n${description.trim()}`;
  } catch (err: any) {
    console.error("Erreur decrireDocument:", err);
    return `Impossible de décrire "${docName}" : ${err.message}`;
  }
}
