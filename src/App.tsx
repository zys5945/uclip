import { Main } from "@/components/main";
import { Titlebar } from "@/components/titlebar";
import "./App.css";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    // prevents default context menu globally
    document.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  }, []);

  return (
    <main className="w-screen h-screen flex flex-col">
      <Titlebar />
      <Main />
    </main>
  );
}
