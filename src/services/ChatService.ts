import { OpenAIClient, AzureKeyCredential } from "@azure/openai";

const functions = [
  {
  name: "getListContent",
  description: "Lire le contenu d'une liste SharePoint",
  parameters: {
    type: "object",
    properties: {
      nomListe: { 
        type: "string", 
        description: "Nom exact de la liste SharePoint dont on veut voir le contenu" 
      }
    },
    required: ["nomListe"]
  }
  },

  {
  name: "passerDemandeConge",
  description: "Crée une demande de congé dans la liste SharePoint",
  parameters: {
    type: "object",
    properties: {
      Title: { type: "string" },
      nom: { type: "string" },
      prenom: { type: "string" },
      typeConge: { type: "string" },
      dateDebut: { type: "string" },
      dateFin: { type: "string" },
      email: { type: "string"}
    },
    required: ["nom", "prénom", "typeConge", "dateDebut", "dateFin"]
  }
}
];

async function getChatResponse(messages: { role: string; content: string }[]): Promise<{ content: string; functionCall?: any }> {
  const deployment_id = "gpt-35-turbo";
  const endpoint = "https://openaiforged.openai.azure.com/";
  const azure_openai_key = "m7HvMGc3UgsMWjEJF9mNSKyXTiE6bwkflXHY4Mnki4wLXBkk4hDzJQQJ99BGAC5T7U2XJ3w3AAABACOGsEQQ";//Clé API

  const client = new OpenAIClient(endpoint, new AzureKeyCredential(azure_openai_key));

  const result = await client.getChatCompletions(deployment_id, messages, {
    functions,
    functionCall: "auto",
    maxTokens: 1000
  });

  const message = result.choices[0].message;
  return { content: message?.content ?? "", functionCall: message?.functionCall };
}

export default getChatResponse;