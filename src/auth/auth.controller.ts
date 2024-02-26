import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { Tokens } from './types';
import { LoginDto } from './dto/login.dto';
import { RtGuard } from '../common/guards/rt.guard';
import { GetCurrentUser, GetCurrentUserId, Public } from 'src/common/decorators';

@Controller('auth')
export class AuthController {
    constructor(private authService:AuthService) {}

    @Public()
    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    register(@Body() registerDto:RegisterDto): Promise<Tokens> {
        return this.authService.register(registerDto);
    }
    
    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() loginDto:LoginDto): Promise<Tokens> {
        return this.authService.login(loginDto);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    logout(@GetCurrentUserId() userId: number): Promise<boolean> {
        return this.authService.logout(userId);
    }

    @Public()
    @UseGuards(RtGuard)
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    refreshTokens(@GetCurrentUserId() userId: number, @GetCurrentUser('refreshToken') refreshToken: string): Promise<Tokens> {
        return this.authService.refreshTokens(userId, refreshToken);
    }
}
