import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsString, Min, ValidateNested } from 'class-validator';

export class ItemFacturaDto {
  @ApiProperty({ example: 'uuid-del-producto', description: 'ID del producto (referencia externa)' })
  @IsString()
  @IsNotEmpty()
  idProducto!: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  cantidad!: number;

  @ApiProperty({ example: 49.99, description: 'Precio unitario sin IVA' })
  @IsNumber()
  @Min(0)
  precioUnitario!: number;
}

export class GenerarFacturaDto {
  @ApiProperty({ example: 'uuid-de-la-reserva', description: 'ID de la reserva a facturar (referencia externa)' })
  @IsString()
  @IsNotEmpty()
  reservaId!: string;

  @ApiProperty({ example: 'uuid-metodo-pago', description: 'ID del método de pago seleccionado' })
  @IsString()
  @IsNotEmpty()
  metodoPagoId!: string;

  @ApiProperty({ type: [ItemFacturaDto], description: 'Líneas de detalle de la factura' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemFacturaDto)
  items!: ItemFacturaDto[];

  @ApiProperty({ required: false, description: 'ID del cliente (solo admin puede especificarlo)' })
  idCliente?: string;
}

export class ProductoEnDetalleFacturaDto {
  @ApiProperty() id!: string;
  @ApiProperty() nombre!: string;
}

export class DetalleFacturaResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() idProducto!: string;
  @ApiProperty() cantidad!: number;
  @ApiProperty() precioUnitario!: number;
  @ApiProperty({ description: 'Subtotal sin IVA' }) subtotal!: number;
  @ApiProperty({ nullable: true, type: () => ProductoEnDetalleFacturaDto })
  producto!: ProductoEnDetalleFacturaDto | null;
}

export class MetodoPagoBasicoDto {
  @ApiProperty() id!: string;
  @ApiProperty() nombre!: string;
}

export class PagoBasicoDto {
  @ApiProperty() id!: string;
  @ApiProperty() monto!: number;
  @ApiProperty({ nullable: true }) fechaPago!: Date | null;
  @ApiProperty({ nullable: true, type: () => MetodoPagoBasicoDto })
  metodoPago!: MetodoPagoBasicoDto | null;
}

export class FacturaResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) idReserva!: string | null;
  @ApiProperty({ nullable: true }) idCliente!: string | null;
  @ApiProperty({ example: 'FAC-00001' }) numeroFactura!: string;
  @ApiProperty({ description: 'Base imponible sin IVA' }) subtotal!: number;
  @ApiProperty({ description: 'IVA (15%)' }) iva!: number;
  @ApiProperty({ description: 'Total con IVA incluido' }) total!: number;
  @ApiProperty({ nullable: true }) fechaEmision!: Date | null;
  @ApiProperty({ type: () => [DetalleFacturaResponseDto] }) detalles!: DetalleFacturaResponseDto[];
  @ApiProperty({ nullable: true, type: () => PagoBasicoDto }) pago!: PagoBasicoDto | null;
}

export class MetodoPagoResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() nombre!: string;
  @ApiProperty({ nullable: true }) createdAt!: Date | null;
}
