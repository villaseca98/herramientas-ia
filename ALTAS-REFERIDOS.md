# Cómo cobrar con Recorta en casa (planes amigo y afiliados)

La web ya funciona sin nada de esto: cada botón lleva a la web oficial de la compañía. Para cobrar, consigue tu enlace o código y pégalo en `data/facturas.json`, en la opción que toque:

- `enlaceReferido`: tu enlace de invitación (el botón "Ver Octopus Energy" pasará a llevar a tu enlace).
- `codigo`: tu código amigo, si la compañía usa códigos (sale en la web con un botón "Copiar").

Al hacer push, Vercel redespliega solo. Datos revisados el 7 de octubre de 2026: confirma cada programa al darte de alta, cambian a menudo.

## Fase 1: planes amigo (cero inversión, empiezas hoy)

Ordenados por lo fácil que es empezar. "Hay que ser cliente" significa que solo puedes invitar si tú también lo eres.

| Compañía | Qué te pagan a ti por invitado | ¿Hay que ser cliente? | Límite |
|---|---|---|---|
| Plenitude (luz/gas) | Tarjeta Amazon 30–60 € | **No** | 10 amigos |
| MyInvestor (banco) | 25 € | Sí (cuenta gratis) | — |
| Openbank (banco) | 70 € | Sí (cuenta gratis) | 10 amigos (700 €) |
| ING (banco) | 50 € (el invitado recibe 250 €) | Sí, Cuenta Nómina | 500 € |
| Octopus Energy (luz/gas) | 50 € en factura (+100 € en el 3.º y 5.º) | Sí | Sin límite |
| Holaluz (luz) | 30 € (400 € si el invitado pone placas) | Sí | Sin límite |
| Lowi (fibra/móvil) | Hasta 60 € | Sí | 24 al año |
| Digi (fibra/móvil) | 30 € en descuentos | Sí | — |

Recomendado para empezar: **Plenitude** (no hace falta ser cliente), **MyInvestor** y **Openbank** (cuentas sin comisiones que no cuestan nada abrir). Si ya eres cliente de alguna de las demás, saca su enlace hoy.

Ojo:
- Lee las condiciones de cada plan amigo: algunos prohíben anunciar el código en publicidad de pago o en webs de cupones. Una web propia de comparativas suele estar permitida, pero compruébalo.
- Los bonos en dinero tributan (retención del 19%, van en la renta).
- Los planes amigo tienen tope. Sirven para arrancar y validar que la gente hace clic; para escalar, la fase 2.

## Fase 2: redes de afiliados (cuando la web tenga visitas)

Las redes pagan por cada alta sin tope, pero aprueban mejor a webs con algo de tráfico. Date de alta gratis y busca en su directorio anunciantes de energía, telecomunicaciones, banca y seguros en España:

- **Awin** (awin.com/es): la más grande en España.
- **Admitad**, **Tradedoubler** y **Webgains**: también trabajan con marcas españolas.

Cuando te aprueben un programa, pega su enlace en `enlaceReferido` en lugar del de plan amigo (paga más y sin límite).

## Siguientes facturas que se pueden añadir

Seguro de coche y de hogar (comparadores con afiliación), gimnasio y alarmas. Cada factura nueva es una entrada más en `data/facturas.json`: la web genera su página, la mete en la calculadora y en el sitemap.
