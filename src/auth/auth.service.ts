import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as argon from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';
import { Tokens, JwtPayload } from './types';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class AuthService {
    constructor(private prisma:PrismaService, private jwtService:JwtService, private config: ConfigService) {}
    
    async register(registerDto:RegisterDto): Promise<Tokens> {
        const hashPassword = await argon.hash(registerDto.password);

        const user = await this.prisma.user.create({
            data: {
                name: registerDto.name,
                email: registerDto.email,
                hashPassword,
            },
        }).catch((error) => {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ForbiddenException('Credentials Incorrect');
                }
            }
            throw error;
        });
        
        const tokens = await this.getTokens(user.id, user.email);
        await this.updateRtHash(user.id, tokens.refresh_token);
        return tokens;
    }
    
    async login(loginDto:LoginDto): Promise<Tokens> {
        const user = await this.prisma.user.findUnique({
            where: {
                email: loginDto.email,
            }
        });

        if (!user) throw new ForbiddenException('Access Denied');

        const passwordMatches = await argon.verify(user.hashPassword, loginDto.password);
        if (!passwordMatches) throw new ForbiddenException('Access Denied');

        const tokens = await this.getTokens(user.id, user.email);
        await this.updateRtHash(user.id, tokens.refresh_token);
        return tokens;
    }
    
    async logout(userId: number): Promise<boolean> {
        await this.prisma.user.updateMany({
            where: {
                id: userId,
                hashRt : {
                    not: null,
                },
            },
            data : {
                hashRt: null,
            },
        });
        return true;
    }
    
    async refreshTokens(userId: number, rt: string): Promise<Tokens> {
        const user = await this.prisma.user.findUnique({
            where: {
                id: userId,
            }
        });
        if (!user || !user.hashRt) throw new ForbiddenException('Access Denied');

        const rtMatches = await argon.verify(user.hashRt, rt);
        if (!rtMatches) throw new ForbiddenException('Access Denied');

        const tokens = await this.getTokens(user.id, user.email);
        await this.updateRtHash(user.id, tokens.refresh_token);
        return tokens;
    }

    async updateRtHash(userId: number, rt: string): Promise<void> {
        const hash = await argon.hash(rt);
        await this.prisma.user.update({
            where: {
                id: userId,
            },
            data : {
                hashRt: hash,
            },
        });
    }

    async getTokens(userId: number, email: string): Promise<Tokens> {
        const jwtPayload: JwtPayload = {
            id: userId,
            email: email,
        }

        const [at, rt] = await Promise.all([
            this.jwtService.signAsync(jwtPayload, {
                secret: this.config.get<string>('AT_SECRET'),
                expiresIn: "15m",
            }),
            this.jwtService.signAsync(jwtPayload, {
                secret: this.config.get<string>("RT_SECRET"),
                expiresIn: "7d",
            }),
        ]);

        return {
            access_token: at,
            refresh_token: rt,
        };
    }
}