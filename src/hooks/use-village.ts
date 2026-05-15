import { useSettings } from "@/lib/settings-store";
import { getVillage, VillageField, VillageInfo } from "@/lib/village-dynamic";

/**
 * Hook to provide reactive access to village-specific dynamic data.
 * Components using this hook will re-render when settings are updated.
 *
 * @example
 *   const { village, district } = useVillage();
 *   const villageName = useVillage("village");
 */
export function useVillage(): VillageInfo;
export function useVillage(field: VillageField): string;
export function useVillage(field?: VillageField): VillageInfo | string {
  // Subscribe to useSettings to trigger re-renders when settings change
  useSettings();

  if (field) {
    return getVillage(field) as string;
  }
  return getVillage();
}
