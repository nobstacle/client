import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  // UseGuards,
} from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HttpExceptionSchema } from '../../__helpers__';
// import { JwtATGuard } from '../../identity/guards';
import { ImageCreateService } from '../services/image-create.service';
import { ImageUpdateService } from '../services/image-update.service';
import { ImageDeleteService } from '../services/image-delete.service';
import { FastifyRequest } from 'fastify';
import {
  PatchImageTemplateOrderReq,
  PatchImageTemplateReq,
  PostImageTemplateReq,
} from '../dto/image.v1.req.dto';
import {
  GetImageTemplateRes,
  GetImageTemplateTagRes,
} from '../dto/image.v1.res.dto';
import { JwtATGuard } from '../../identity/guards';
import { ImageGetService } from '../services/image-get.service';
import { PrismaService } from '../../common/services';

@ApiTags('image')
@ApiInternalServerErrorResponse({ type: HttpExceptionSchema })
@Controller({ path: 'image', version: '1' })
export class ImageTemplateController {
  constructor(
    private readonly imageCreateSvc: ImageCreateService,
    private readonly imageGetSvc: ImageGetService,
    private readonly imageUpdateSvc: ImageUpdateService,
    private readonly imageDeleteSvc: ImageDeleteService,
    private readonly prismaSvc: PrismaService,
  ) {}

  @Post('')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtATGuard)
  @ApiResponse({ type: GetImageTemplateRes, status: HttpStatus.CREATED })
  @ApiResponse({ type: HttpExceptionSchema, status: HttpStatus.BAD_REQUEST })
  async createImageTemplate(
    @Body() data: PostImageTemplateReq,
    @Req() req: FastifyRequest,
  ) {
    const image = await this.imageCreateSvc.createOne({
      url: data.url,
      tag: data.tag,
      Template: {
        connectOrCreate: {
          where: { companyId: req.user.companyId },
          create: { companyId: req.user.companyId },
        },
      },
      langCode: data.langCode,
      defaultLangCode: data.defaultLangCode,
    });

    return new GetImageTemplateRes(image);
  }

  @Patch(':tag')
  @ApiParam({ name: 'tag', type: 'string', required: true })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtATGuard)
  @ApiResponse({ type: GetImageTemplateRes, status: HttpStatus.OK })
  @ApiResponse({ type: HttpExceptionSchema, status: HttpStatus.BAD_REQUEST })
  async patchImageTemplateOne(
    @Param('tag') tag: string,
    @Body() data: PatchImageTemplateReq,
    @Req() req: FastifyRequest,
  ) {
    const imageTemplate = await this.imageUpdateSvc.updateImage(
      { tag, templateId: req.user.companyId },
      data.defaultLangCode,
      { langCode: data.langCode, url: data.url },
    );

    return new GetImageTemplateRes(imageTemplate);
  }

  @Patch('order/:id')
  @ApiParam({ name: 'id', type: 'number', required: true })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtATGuard)
  @ApiResponse({ type: Boolean, status: HttpStatus.OK })
  @ApiResponse({ type: HttpExceptionSchema, status: HttpStatus.BAD_REQUEST })
  async patchImageTemplateOrder(
    @Param('id') id: number,
    @Body() data: PatchImageTemplateOrderReq,
  ) {
    await this.prismaSvc.image.update({
      where: { id },
      data: { order: data.order },
    });

    return true;
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: 'integer', required: true })
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtATGuard)
  @ApiResponse({ type: Boolean, status: HttpStatus.OK })
  @ApiResponse({ type: HttpExceptionSchema, status: HttpStatus.BAD_REQUEST })
  async deleteImageTemplateOne(@Param('id') id: number) {
    await this.imageDeleteSvc.deleteOne({
      id,
    });

    return true;
  }

  @Get('tags')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtATGuard)
  @ApiResponse({
    type: GetImageTemplateTagRes,
    isArray: true,
    status: HttpStatus.OK,
  })
  @ApiResponse({ type: HttpExceptionSchema, status: HttpStatus.BAD_REQUEST })
  async getImageTags(@Req() req: FastifyRequest) {
    const imageTags = await this.imageGetSvc.getMany({
      where: { Template: { companyId: req.user.companyId } },
      select: { tag: true, langCode: true },
    });

    return imageTags.map(({ tag, langCode }) => {
      return new GetImageTemplateTagRes({ tag, langCode });
    });
  }
}
