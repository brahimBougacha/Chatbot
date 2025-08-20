import * as React from 'react';
import styles from './Chatbot.module.scss';
import getChatResponse from '../../../services/ChatService';
import { IChatbotProps } from './IChatbotProps';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.min.js';
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css'

import { getListContent } from './functions/getListContent';
import { getSiteInfo } from './functions/getSiteInfo';
import { passerDemandeConge } from './functions/passerDemandeConge';
import { getSoldeConge } from './functions/getSoldeConge';
import { getDocumentsBibliotheque } from './functions/getDocumentsBibliotheque';
import { resumerDocument } from './functions/resumerDocument';
import  {decrireDocument} from './functions/decrireDocument';
import { rechercheDocumentaire } from './functions/RechercheDocumentaire';
import { interrogerDocument } from './functions/interrogerDocument';

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};
/// partie ajouter pour sortie un tableaux !!!!!!
import Table from 'react-bootstrap/Table';
const renderContent = (content: string) => {
  const parts = content.split("\n\n");
  return (
    <>
      {parts.map((part, idx) => {
        if (part.includes('|') && part.includes('---')) {
          const lines = part.trim().split("\n").filter(l => l.startsWith("|"));
          if (lines.length < 2) return <p key={idx}>{part}</p>;

          const headers = lines[0].split("|").map(h => h.trim()).filter(Boolean);
          const rows = lines.slice(2).map(line => {
            const values = line.split("|").map(v => v.trim()).filter(Boolean);
            return values;
          });

          return (
            <Table striped bordered hover size="sm" responsive key={idx}>
              <thead>
                <tr>
                  {headers.map((h, idx2) => (
                    <th key={idx2}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((val, cIdx) => {
                      // Vérifier si c'est un lien markdown [Texte](url)
                      const match = val.match(/^\[(.+)\]\((.+)\)$/);
                      if (match) {
                        const text = match[1];
                        const url = match[2];
                        return (
                          <td key={cIdx}>
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              {text}
                            </a>
                          </td>
                        );
                      }
                      return <td key={cIdx}>{val}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </Table>
          );
        }
        return <p key={idx}>{part}</p>;
      })}
    </>
  );
};
///// fin de partie ajouter !!!!!!!!!!!!!!!!!!!!
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
      const intentionDocumentaire = /recherche\s+(?:documentaire|document)|chercher\s+(?:documentaire|document)/i.test(input);

      if (/contenu.*site/i.test(input)) {
        reply = await getSiteInfo(context);
      }
      else if (/contenu.*bibliothèque|documents/i.test(input)) {
        reply = await getDocumentsBibliotheque(context);
      }
      else if (/contenu.*liste\s+DemandesCongé/i.test(input)) {
        reply = await getListContent(context, "DemandesCongé");
      }
      else if (/résum(?:e|é).*document/i.test(input)) {
      const match = input.match(/document\s+(.+\.(pdf|docx|txt))/i);

      if (match) {
        const fileName = match[1].trim();
        reply = await resumerDocument(context, fileName);
      } else {
        reply = "Merci de préciser le nom complet du fichier (avec extension : .pdf, .docx ou .txt).";
      }
     }
      else if (/(?:description|décrire).*document/i.test(input)) {
        const m = input.match(/document\s+(.+\.(pdf|docx|txt))/i);
        reply = m
          ? await decrireDocument(context, m[1].trim())
          : "Merci de préciser le nom complet du fichier (avec extension : .pdf, .docx ou .txt).";
      }
      else if (/(?:quel(?:le)?\s+(?:document|fichier)|quels?\s+documents?).*?(parle\s+de|contient|traite\s+de|sur|à\s+propos\s+de)/i.test(input)) {
        reply = await rechercheDocumentaire(context, input);
      }
      else if (/document\s+([\w\-\s]+\.(pdf|docx|txt|csv))/i.test(input)) {
        const match = input.match(/document\s+([\w\-\s]+\.(pdf|docx|txt|csv))/i);

        if (match) {
            const docName = match[1].trim();
            const question = input.replace(/.*document\s+[\w\-\s]+\.(pdf|docx|txt|csv)\s*/i, "").trim();
            if (!question) {
            reply = `Vous avez mentionné **${docName}**, mais je n’ai pas trouvé de question. Pouvez-vous préciser ce que vous voulez savoir ?`;
            } else {
            reply = await interrogerDocument(context, docName, question);
            }
            setMessages(prev => [...prev, { role: "assistant", content: reply }]);
            setLoading(false);
            return;
        } else {
            reply = "Merci de préciser le nom complet du document (avec extension : .pdf, .docx ou .txt).";
        }
       } 
       else if (/solde.*congé/i.test(input)) {
        const parts = userDisplayName.split(" ");
        const nom = parts.slice(1).join(" ");
        reply = await getSoldeConge(context, nom);

      } else if (/demande.*congé/i.test(input)) {
      const [prenom] = userDisplayName.split(" ");

      reply = `Parfait ${prenom}! Pour passer une demande de congé, donnez-moi :
      - Le type de congé (ex: RTT, Maladie)  
      - La date de début du congé  
      - La date de fin du congé  
      - Votre adresse e-mail (si différent de ${userEmail})`;
      
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      setLoading(false);
      return;
      }
      else if (functionCall && !intentionDocumentaire) {
       
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
          case 'passerDemandeConge': reply = await passerDemandeConge(context,args); break;
          case 'getSiteInfo': reply = await getSiteInfo(context); break;
          default: reply = `Fonction non reconnue: ${name}`;
        }
      }
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error: any) {
      console.error('Erreur GPT flow:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: `Erreur: ${error.message}` }]);
    }

    setLoading(false);
  };
  
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
                <div className={styles.bubbleContent}> {renderContent(msg.content)}
                </div>            
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