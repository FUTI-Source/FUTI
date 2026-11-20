export interface SendMailRequest {
  email: string;
  content: string;
}

export interface SendMailResponse {
  success: boolean;
  messageId: string;
  confirmationSent: boolean;
  confirmationMessageId?: string;
}

export interface MailErrorBody {
  error: {
    code: string;
    message: string;
  };
}
