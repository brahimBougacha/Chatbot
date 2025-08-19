import { SPHttpClient } from '@microsoft/sp-http';

export const getSoldeConge = async (context: any, nom: string): Promise<string> => {
  try {
    
    const response = await context.spHttpClient.get(
      `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('DemandesConge')/items?$filter=nom eq '${nom}'&$orderby=Id desc&$top=1`,
      SPHttpClient.configurations.v1
    );
    const json = await response.json();

    if (!json.value || json.value.length === 0) {
      return `Aucun solde trouvé pour ${nom}. Le solde par défaut est de 30 jours.`;
    }
    const solde = json.value[0].SoldeConge ?? 30;
    return `✅ Le solde actuel de congé pour ${nom} est de **${solde} jours**.`;
  } catch (error: any) {
    console.error("Erreur getSoldeConge:", error);
    return `Erreur lors de la récupération du solde : ${error.message}`;
  }
};