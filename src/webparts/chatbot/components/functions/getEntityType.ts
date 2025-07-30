import { SPHttpClient } from '@microsoft/sp-http';

 // Fonction utilitaire pour récupérer le type d'entité (EntityType) d'une liste SharePoint
  export const getEntityTypeFromList = async (context: any, listName: string): Promise<string> => {
    const res = await context.spHttpClient.get(
      `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('${listName}')?$select=ListItemEntityTypeFullName`,
      SPHttpClient.configurations.v1
    );
    const json = await res.json();
    const typeName = json.ListItemEntityTypeFullName || json.d?.ListItemEntityTypeFullName;
        if (!typeName) throw new Error(`Impossible de récupérer le EntityType pour ${listName}`);
        return typeName;
  };
