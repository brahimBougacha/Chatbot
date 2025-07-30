// src/webparts/chatbot/ChatbotWebPart.ts
import * as React from 'react';
import * as ReactDom from 'react-dom';
import Chatbot from './components/Chatbot';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IChatbotProps } from './components/IChatbotProps';

export default class ChatbotWebPart extends BaseClientSideWebPart<{}> {

public render(): void {
  const props: IChatbotProps = {
    userDisplayName: this.context.pageContext.user.displayName,
    userEmail: this.context.pageContext.user.email,
    context: this.context 
  };

  const element = React.createElement(Chatbot, props);
  ReactDom.render(element, this.domElement);
}
}
