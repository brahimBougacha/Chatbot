import { SPHttpClient } from '@microsoft/sp-http';
import { getEntityTypeFromList } from './getEntityType';

  // Fonction qui enregistre une demande de congé !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
const calculerJours = (dateDebut: Date, dateFin: Date): number => {
  const diffTime = Math.abs(dateFin.getTime() - dateDebut.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclure la date de début
};


export const passerDemandeConge = async (context: any, args: any): Promise<string> => {  
  try {
    
    // DD/MM/YYYY ou bien YYYY/MM/DD
    const parseDate = (str: string) => {
      const parts = str.split(/[\/\-]/); 
      if (parts[0].length === 4) {
        // format YYYY-MM-DD
        return new Date(`${parts[0]}-${parts[1]}-${parts[2]}T00:00:00Z`);
      } else {
        // format DD/MM/YYYY
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
      }
    };
      // Conversion des dates vers le format ISO attendu par SharePoint
      const dateDebut = parseDate(args.dateDebut);
      const dateFin = parseDate(args.dateFin);
      const joursDemandes = calculerJours(dateDebut, dateFin);

    const soldeRes = await context.spHttpClient.get(
      `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('DemandesConge')/items?$filter=nom eq '${args.nom}'&$top=1&$orderby=Id desc`,
      SPHttpClient.configurations.v1
    );
    const soldeJson = await soldeRes.json();

    // Par défaut, chaque utilisateur a 30 jours
    let soldeActuel = 30;
    if (soldeJson.value && soldeJson.value.length > 0 && soldeJson.value[0].SoldeConge !== undefined) {
      soldeActuel = soldeJson.value[0].SoldeConge;
    }

    let joursPayes = 0;
    let joursNonPayes = 0;
    let nouveauSolde = soldeActuel;

    if (joursDemandes <= soldeActuel) {
      
      joursPayes = joursDemandes;
      nouveauSolde -= joursDemandes;
    } else {
      
      joursPayes = soldeActuel;
      joursNonPayes = joursDemandes - soldeActuel;
      nouveauSolde = 0;
    }


      const entityType = await getEntityTypeFromList(context, 'DemandesConge');
      const payload = {
        "@odata.type": entityType,
        Title: `Demande congé ${args.typeConge} - ${args.nom} ${args.prenom}`,
        nom: args.nom,
        prenom: args.prenom,
        TypeConge: args.typeConge,
        DateDebut: dateDebut.toISOString(),
        DateFin: dateFin.toISOString(),
        email: args.email,
        SoldeConge: nouveauSolde, 
        JoursPayes: joursPayes,
        JoursNonPayes: joursNonPayes
      };
      const postRes = await context.spHttpClient.post(
        `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('DemandesConge')/items`,
        SPHttpClient.configurations.v1,
        {
          headers: {
            "Accept": "application/json;odata.metadata=minimal",
            "Content-Type": "application/json;odata.metadata=minimal"
          },
          body: JSON.stringify(payload)
        }
      );
      if (!postRes.ok) {
        const text = await postRes.text();
        console.error("HTTP Conge error:", text);
        throw new Error(text);
      }
      return `✅ Demande de congé enregistrée pour ${args.prenom} ${args.nom} du ${args.dateDebut} au ${args.dateFin}. Votre nouveaux solde actuelle est ${nouveauSolde}`;
    } catch (error: any) {
      console.error("Erreur passerDemandeConge:", error);
      return `❌ Échec enregistrement congé: ${error.message}`;
    }
  };