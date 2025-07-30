import { WebPartContext } from "@microsoft/sp-webpart-base";

export interface IChatbotProps {
  /*description: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;*/
  userDisplayName: string;
  userEmail: string;
  context: WebPartContext;
}

