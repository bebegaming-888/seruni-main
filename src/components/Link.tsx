import { Link as RouterLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
  children?: ReactNode;
};

const KNOWN_ROUTES = new Set([
  "/",
  "/pelayanan/e-surat",
  "/pelayanan/monitoring",
  "/admin",
  "/informasi/berita",
  "/informasi/berita/$slug",
  "/verifikasi/$no",
  "/pelayanan/penduduk",
  "/profil/desa",
  "/profil/perangkat",
  "/profil/lembaga",
  "/profil/bpd",
  "/profil/lpm",
  "/profil/pkkrw",
  "/profil/karangtaruna",
  "/ekonomi/bumdes",
  "/ekonomi/kdmp",
  "/laporan/apbdes",
  "/laporan/rpjmdes",
  "/laporan/rkpdes",
  "/laporan/realisasi",
  "/laporan/pbb",
  "/informasi/agenda",
  "/informasi/galeri",
  "/informasi/idm",
  "/informasi/pengumuman",
  "/lainnya/monografi",
  "/lainnya/produk-hukum",
  "/lainnya/komoditas",
  "/lainnya/peta",
  "/wisata/destinasi",
  "/wisata/peta",
]);

export function Link({ to, params, search, children, ...rest }: Props) {
  if (KNOWN_ROUTES.has(to) || to.includes("$")) {
    return (
      <RouterLink
        to={to as never}
        params={params as never}
        search={search as never}
        {...(rest as Record<string, unknown>)}
      >
        {children}
      </RouterLink>
    );
  }
  return (
    <a href={to} {...rest}>
      {children}
    </a>
  );
}
