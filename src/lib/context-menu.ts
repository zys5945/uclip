import { PhysicalPosition } from "@tauri-apps/api/dpi";
import { Menu, MenuOptions } from "@tauri-apps/api/menu";

export async function showContextMenu(
  at: { x: number; y: number },
  menuOptions: MenuOptions
) {
  const menu = await Menu.new(menuOptions);
  menu.popup(new PhysicalPosition(at.x, at.y));
}
