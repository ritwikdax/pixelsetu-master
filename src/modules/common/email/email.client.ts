import FormData from "form-data";
import { Inject, Logger } from "@nestjs/common";
import { AxiosInstance } from "axios";

export type EmailTemplate = 'pixelsetu_login_failure' | 'onboard_pixelsetu' | 'pixelsetu_org_invitation' | 'pixelsetu_welcome';

interface EmailData {
    subject: string;
    from?: string;
    to?: string | string[];
    template?: EmailTemplate;
    templateData?: Record<string, any>;
}

export const EMAIL_CLIENT = Symbol('EMAIL_CLIENT');
export const InjectEmailClient = (): ParameterDecorator => {
    return Inject(EMAIL_CLIENT);
}

export class EmailClient {
    private readonly logger = new Logger(EmailClient.name);
    private readonly FROM = "Pixelsetu <noreply@pixelsetu.com>";
    private readonly TO = ['Ritwik Das <ritwikdax@gmail.com>', 'Prantik Das <dasprantik76@gmail.com>'];
    private emailData: Partial<EmailData> = {};

    constructor(private readonly emailClient: AxiosInstance) {}


    from(from?: string): this {
        this.emailData.from = from ?? this.FROM;
        return this;
    }

    to(to: string | string[]): this {
        this.emailData.to = to;
        return this;
    }

    subject(subject: string): this {
        this.emailData.subject = subject;
        return this;
    }

    template(template: EmailTemplate): this {
        this.emailData.template = template;
        return this;
    }

    templateData(templateData: Record<string, any>): this {
        this.emailData.templateData = templateData;
        return this;
    }

    async send() {
        this.validate();
        // Create form data for Mailgun API (matching curl request format)
        const formData = new FormData();
        formData.append("from", this.emailData.from!);
        formData.append("to", Array.isArray(this.emailData.to) ? this.emailData.to.join(", ") : this.emailData.to!);
        formData.append("subject", this.emailData.subject!);
        if (this.emailData.template) {
            formData.append("template", this.emailData.template);
        }
        if (this.emailData.templateData) {
            formData.append("h:X-Mailgun-Variables", JSON.stringify(this.emailData.templateData));
        }
        try {
            const response = await this.emailClient.post("/messages", formData, {
                headers: formData.getHeaders(),
            });
            this.logger.log(`Email sent successfully to ${this.emailData.to}`, response.data);
            return response.data;
        } catch (error: any) {
            this.logger.error(`Failed to send email to ${this.emailData.to}:`, error.response?.data || error.message);
            throw error;
        }
    }

    private validate(): void {
        if (!this.emailData.from) {
            this.emailData.from = this.FROM;
        }
        if (!this.emailData.to) {
            this.emailData.to = this.TO;
        }
        if (!this.emailData.subject) {
            throw new Error("Subject is required");
        }
        if(this.emailData.template && !this.emailData.templateData) {
            throw new Error("Template data is required when using a template");
        }
    }
}