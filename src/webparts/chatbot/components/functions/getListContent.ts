import { SPHttpClient } from '@microsoft/sp-http';

// Fonction pour lire dynamiquement le contenu d'une liste SharePoint
export const getListContent = async (context: any, listName: string): Promise<string> => {
  try {
    const response = await context.spHttpClient.get(
      `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('${listName}')/items?$top=50`,
      SPHttpClient.configurations.v1
    );
    const json = await response.json();

    if (!json.value || json.value.length === 0) {
      return `⚠️ La liste "${listName}" est vide ou inaccessible.`;
    }

    const firstItem = json.value[0];

    // Colonnes techniques SharePoint à ignorer
    const technicalColumns = [
      "@odata.type", "@odata.id", "@odata.etag", "@odata.editLink",
      "FileSystemObjectType", "ServerRedirectedEmbedUri", "ServerRedirectedEmbedUrl",
      "ContentTypeId", "GUID", "ID", "Id", "ComplianceAssetId",
      "Attachments", "AuthorId", "EditorId", "OData__UIVersionString",
      "Modified", "Created", "OData__ColorTag" 
    ];

    // Filtrer uniquement les colonnes utiles
    const allowedColumns = Object.keys(firstItem).filter(
      col => !technicalColumns.includes(col)
    );

    // Générer l'entête du tableau
    let table = `📋 Contenu de la liste **${listName}** :\n\n`;
    table += `| ${allowedColumns.join(" | ")} |\n`;
   // table += `| ${allowedColumns.map(() => "---").join(" | ")} |\n`;

    // Générer les lignes
    json.value.forEach((item: any) => {
      const row = allowedColumns.map(col => item[col] ?? "—").join(" | ");
      table += `| ${row} |\n`;
    });

    return table;
  } catch (error) {
    console.error("Erreur getListContent:", error);
    return `❌ Erreur lors de l'accès à la liste "${listName}".`;
  }
};
