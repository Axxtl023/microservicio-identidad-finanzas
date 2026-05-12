import type { FacturaConDetallesMs } from '../../data-access/repositories/interfaces/i-facturas.repository';
import type {
  FacturaDataModel,
  DetalleFacturaDataModel,
  PagoBasicoDataModel,
} from '../models/factura.data-model';

export class FacturaDataMapper {
  static toDataModel(entity: FacturaConDetallesMs): FacturaDataModel {
    const detalles: DetalleFacturaDataModel[] = entity.detalles_factura.map((d) => ({
      id: d.id,
      idProducto: d.id_producto_externo,
      cantidad: d.cantidad,
      precioUnitario: Number(d.precio_unitario),
      subtotal: Number(d.subtotal),
      // id_producto es referencia simple — no hay join con productos en este microservicio
      producto: null,
    }));

    const subtotal = detalles.reduce((sum, d) => sum + d.subtotal, 0);
    const total = Number(entity.total);
    const iva = total - subtotal;

    const pago: PagoBasicoDataModel | null = entity.pago
      ? {
          id: entity.pago.id,
          monto: Number(entity.pago.monto),
          fechaPago: entity.pago.fecha_pago ?? null,
          metodoPago: entity.pago.metodos_pago
            ? { id: entity.pago.metodos_pago.id, nombre: entity.pago.metodos_pago.nombre }
            : null,
        }
      : null;

    return {
      id: entity.id,
      idReserva: entity.id_reserva,
      idCliente: null,
      numeroFactura: entity.numero_factura,
      subtotal,
      iva,
      total,
      fechaEmision: entity.fecha_emision ?? null,
      detalles,
      pago,
    };
  }
}
