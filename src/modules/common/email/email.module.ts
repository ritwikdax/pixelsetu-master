import { Module } from '@nestjs/common';
import { HttpModule } from '../http/http.module';
import { EMAIL_CLIENT, EmailClient } from './email.client';
import axios from 'axios';
import { AppConfigService } from '../config/config.service';
import { EmailService } from './email.service';

@Module({
    imports: [HttpModule.register({
        baseURL: 'https://api.mailgun.net/v3/pixelsetu.com',
    })],
    providers: [{
        provide: EMAIL_CLIENT,
        useFactory: (appConfig: AppConfigService) => {
            const key = appConfig.getConfig("MAILGUN_API_KEY")
            const domain = appConfig.getConfig("MAILGUN_DOMAIN")
            return new EmailClient(axios.create({
                baseURL: `https://api.mailgun.net/v3/${domain}`,
                auth: {
                    username: 'api',
                    password: key
                },
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }))
        },
        inject: [AppConfigService],
    }, EmailService],
    exports: [EmailService, EMAIL_CLIENT]

})
export class EmailModule { }
