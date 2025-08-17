import { SPHttpClient } from '@microsoft/sp-http';

export const getSiteInfo = async (context: any): Promise<string> => {
  try {
    const response = await context.spHttpClient.get(
     `${context.pageContext.web.absoluteUrl}/_api/web/lists?$select=Title,ItemCount`,
      SPHttpClient.configurations.v1
    );
    const json = await response.json();
    if (!json.value || json.value.length === 0) {
      return `Le Site est vide ou inaccessible.`;
    }
    return json.value.map((l: any) => `- ${l.Title} (${l.ItemCount} items)`).join("\n");
    } catch (error: any) {
      return `Échec lecture site: ${error.message}`;
  }
};