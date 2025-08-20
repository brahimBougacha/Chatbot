import { SPHttpClient } from '@microsoft/sp-http';

export const getDocumentsBibliotheque = async (context: any): Promise<string> => {
  try {
    const response = await context.spHttpClient.get(
      `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('Documents')/items?$select=FileLeafRef,FileRef&$top=50`,
      SPHttpClient.configurations.v1
    );
    const json = await response.json();

    if (!json.value || json.value.length === 0) {
      return `La bibliothèque "Documents" est vide ou inaccessible.`;
    }

    const webAbs: string = context.pageContext.web.absoluteUrl; 
    const webServerRel: string = context.pageContext.web.serverRelativeUrl || '';
    const origin =
      typeof window !== 'undefined' && window.location && window.location.origin
        ? window.location.origin
        : webAbs.replace(webServerRel, '');

    let table = `Contenu de la bibliothèque **Documents** :\n\n`;
    table += `| Nom du fichier | Lien |\n`;
    table += `| --- | --- |\n`;

    json.value.forEach((doc: any) => {
      const nomFichier = doc.FileLeafRef;
      const lien = `${origin}${doc.FileRef}`;
      table += `| ${nomFichier} | [Ouvrir](${lien}) |\n`;
    });

    return table;
  } catch (error) {
    console.error("Erreur getDocumentsBibliotheque:", error);
    return `Erreur lors de l'accès à la bibliothèque "Documents".`;
  }
};
