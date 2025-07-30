import { getEntityTypeFromList } from './getEntityType';
import { SPHttpClient } from '@microsoft/sp-http';

  //   Fonction qui enregistre une demande de CV !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  export const passerDemandeCV = async (context: any, args: any): Promise<string> => {
    try {
      // Récupère dynamiquement le bon type d'entité
      const entityType = await getEntityTypeFromList(context,'DemandeCV');

      // Prépare le corps en JSON Light (OData v4)
      const payload = {
        "@odata.type": entityType,
        Title: `${args.nom} ${args.prenom}`, 
        nom: args.nom,
        prenom: args.prenom,
        age: args.age,
        genre: args.genre,
        profession: args.profession,
        email: args.email
      };

      // Envoie la requête POST à SharePoint
      const postRes = await context.spHttpClient.post(
        `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('DemandeCV')/items`,
        SPHttpClient.configurations.v1,
        {
          headers: {
            "Accept": "application/json;odata.metadata=minimal",   // OData v4
            "Content-Type": "application/json;odata.metadata=minimal"
          },
          body: JSON.stringify(payload)
        }
      );
      if (!postRes.ok) {
        const text = await postRes.text();
        console.error("HTTP CV error:", text);
        throw new Error(text);
      }

      return `✅ Demande de CV enregistrée pour ${args.nom}. Un e‑mail sera envoyé à ${args.email}.`;
    } catch (error: any) {
      console.error("Erreur passerDemandeCV:", error);
      return `❌ Échec enregistrement CV: ${error.message}`;
    }
  };
