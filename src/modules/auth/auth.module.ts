import { Module } from '@nestjs/common';
import { HttpModule } from '../common/http/http.module';
import { GoogleLoginService } from './login/googleLogin.service';
import { JwtService } from './jwt.service';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  providers: [AuthGuard, GoogleLoginService, JwtService],
  exports: [JwtService, AuthGuard, GoogleLoginService],
})
export class AuthModule {}
