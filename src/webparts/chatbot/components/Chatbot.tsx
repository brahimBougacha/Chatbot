import * as React from 'react';
import styles from './Chatbot.module.scss';
import getChatResponse from '../../../services/ChatService';
//import { SPHttpClient } from '@microsoft/sp-http'; // Importe le client HTTP de SharePoint. C'est l'outil fourni par SPFx pour faire des appels API authentifiés à SharePoint 
import { IChatbotProps } from './IChatbotProps';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.min.js';
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css'
// importé les function :
import { getListContent } from './functions/getListContent';
import { getSiteInfo } from './functions/getSiteInfo';
import { passerDemandeCV } from './functions/passerDemandeCV';
import { passerDemandeConge } from './functions/passerDemandeConge';

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const Chatbot: React.FC<IChatbotProps> = ({ userDisplayName, userEmail, context }) => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);

    const newUser: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, newUser]);
    setInput('');

    const systemPrompt: ChatMessage = {
      role: 'system',
      content: `Assistant RH SharePoint. Utilisateur: ${userDisplayName} <${userEmail}>. Login: ${context.pageContext.user.loginName}`
    };

    try {
      const { content, functionCall } = await getChatResponse([systemPrompt, ...messages, newUser]);
      let reply = content;
      if (/contenu.*site/i.test(input)) {
        reply = await getSiteInfo(context);
      } else if (/contenu.*liste/i.test(input)) {
        const listNameMatch = input.match(/liste\s+([a-zA-Z0-9]+)/i);
        if (listNameMatch) {
          reply = await getListContent(context, listNameMatch[1]);
        }
      } else if (/demande.*congé/i.test(input)) {
      const [prenom] = userDisplayName.split(" ");

      reply = `Parfait ${prenom}! Pour passer une demande de congé, donnez-moi :
      - Le type de congé (ex: RTT, Maladie)  
      - La date de début du congé  
      - La date de fin du congé  
      - Votre adresse e-mail (si différent de ${userEmail})`;
      // On sauvegarde dans un état temporaire le nom/prénom déjà connus
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      setLoading(false);
      return;

      }
       else if (functionCall) {
        const { name, arguments: argsStr } = functionCall;
        const args = JSON.parse(argsStr || '{}');
        // Récupérer nom et prénom depuis userDisplayName si non fournis
        const parts = userDisplayName.split(" ");
        const prenom = parts[0];
        const nom = parts.slice(1).join(" ");

        if (name === 'passerDemandeConge') {
          args.nom = args.nom || nom;
          args.prenom = args.prenom || prenom;
        }
        switch (name) {
          case 'getListContent': reply = await getListContent(context,args.nomListe); break;
          case 'passerDemandeCV': reply = await passerDemandeCV(context,args); break;
          case 'passerDemandeConge': reply = await passerDemandeConge(context,args); break;
          case 'getSiteInfo': reply = await getSiteInfo(context); break;
          default: reply = `❌ Fonction non reconnue: ${name}`;
        }
      }
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error: any) {
      console.error('Erreur GPT flow:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Erreur: ${error.message}` }]);
    }

    setLoading(false);
  };

  //(Sauvegarder dans SharePoint) Méthode pour save la conversation dans une liste sharePoint !!!!!!
  /*const saveConversation = async (): Promise<void> => {
  const listName = 'ChatConversations';
  const url = `${context.pageContext.web.absoluteUrl}/_api/web/lists/getbytitle('${listName}')/items`;


  const formattedMessages = messages.map(msg => {
    const prefix = msg.role === 'user' ? '🧑:' : '🤖:';
    return `${prefix} ${msg.content}`;
  });

  const conversationAsText = formattedMessages.join('\n\n');
  const item = {
    Title: `Conversation ${new Date().toLocaleString()}`,
    userName: userDisplayName,
    userEmail: userEmail,
    Messages: conversationAsText, 
    DateEnregistrement: new Date().toISOString()
  };

  const options = {
    headers: {
      'Accept': 'application/json',
      'Content-type': 'application/json;odata=nometadata'
    },
    body: JSON.stringify(item)
  };

  try {
    const response = await context.spHttpClient.post(
      url,
      SPHttpClient.configurations.v1,
      options
    );

    if (response.status >= 200 && response.status < 300) {
      alert("✅ Conversation enregistrée avec succès !");
    } else {
      const errorText = await response.text();
      console.error("Erreur SharePoint :", errorText);
      alert("❌ Échec de l’enregistrement.");
    }

  } catch (err: any) {
    console.error("Erreur technique lors de l'appel :", err);
    alert("❌ Impossible d’enregistrer la conversation. Une erreur technique est survenue.");
  }
};*/

  // Méthode pour afficher un message en haut de la descussion !!!!!!!!!!
  const getGreeting = (userDisplayName: string) => {
  const hour = new Date().getHours();

  if (hour < 12) return `Bonjour ${userDisplayName}! Comment puis-je vous aider ?`;
  if (hour < 18) return `Salut ${userDisplayName} ! Que puis-je faire pour vous cet après-midi ?`;
  return `Bonsoir ${userDisplayName} ! Je suis à votre service pour terminer la journée en beauté.`;
};

    return (
    <div className={styles.chatbot}>
      <div className={styles.toolbar}>
        <button 
          disabled={messages.length === 0} className={styles.saveButton}> Enregistrer la conversation
        </button>
      </div>
      
      <div className={styles.chatHistory}>
        {messages.length === 0 ? (
          <div className={styles.welcomeMessage}>
            {getGreeting(userDisplayName)}
            <img
              alt=""
              src={require('../assets/logochatbot2.jpg')}
              className={styles.welcomeImage}
            />
          </div>
        ) : (
        <div className={styles.chatScroll}>
            {messages.map((msg, index) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={index}
                className={`${styles.bubble} ${
                  isUser ? styles.userBubble : styles.botBubble
                }`}
              >
                <div
                  className={`${styles.bubbleHeader} ${
                    isUser ? styles.userHeader : styles.botHeader
                  }`}
                >
                  {isUser ? "user" : "Chatbot"}
                </div>
                <div className={styles.bubbleContent}>{msg.content}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>

      <div className={styles.chatInputWrapper}>
        <div className={styles.chatInputContainer}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            className={styles.chatInput}
            placeholder="Écris ton message..."
            disabled={loading}
          />
          <button onClick={handleSend} className={styles.sendButton} disabled={loading}>
            {loading ? "Attendez..." : "Envoyer"}
          </button>
          <button onClick={() => setMessages([])} className={styles.newChatButton}>
            Nouvelle discussion
          </button>
        </div>
      </div>
    </div>
  );
};
export default Chatbot;