import './FloatingWhatsApp.css'

const WHATSAPP_HREF = 'https://wa.me/573113540008'

export default function FloatingWhatsApp() {
  return (
    <a
      className="floating-whatsapp"
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribir por WhatsApp a La Industria Bolera"
      title="WhatsApp"
    >
      <i className="fab fa-whatsapp" aria-hidden />
    </a>
  )
}
