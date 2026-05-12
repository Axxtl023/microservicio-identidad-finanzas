export interface ProductoEnDetalleFacturaDataModel {
  id: string;
  nombre: string;
}

export interface DetalleFacturaDataModel {
  id: string;
  idProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  producto: ProductoEnDetalleFacturaDataModel | null;
}

export interface MetodoPagoBasicoDataModel {
  id: string;
  nombre: string;
}

export interface PagoBasicoDataModel {
  id: string;
  monto: number;
  fechaPago: Date | null;
  metodoPago: MetodoPagoBasicoDataModel | null;
}

export interface FacturaDataModel {
  id: string;
  idReserva: string | null;
  idCliente: string | null;
  numeroFactura: string;
  subtotal: number;
  iva: number;
  total: number;
  fechaEmision: Date | null;
  detalles: DetalleFacturaDataModel[];
  pago: PagoBasicoDataModel | null;
}
