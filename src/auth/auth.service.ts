import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserDto } from 'src/dto/user.dto';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { comparePassword } from 'src/utils/utils';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // create token for users who are allowed to sign in
  async createToken(user: UserDto): Promise<string> {
    const foundUser = await this.userService.findByName(user.name);

    if (!foundUser) {
      throw new UnauthorizedException('Incorrect Credentials');
    }
    const isAuthorized = await comparePassword(
      user.password,
      foundUser.password,
    );

    if (!isAuthorized) {
      throw new UnauthorizedException('Incorrect Credentials');
    }

    delete foundUser.password;

    const payload = { sub: foundUser.id, user: foundUser };
    try {
      return this.jwtService.signAsync(payload);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  // if token is valid, signed item will be returned, if not error will occur
  //used to check if user is logged in
  async getJwtPayload(token: string): Promise<Omit<User, 'password'>> {
    try {
      const { user } = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      return user;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}
