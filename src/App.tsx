import { Main } from "@/components/main";
import { Titlebar } from "@/components/titlebar";
import "./App.css";

export default function Home() {
  return (
    <main className="w-screen h-screen">
      <Titlebar />
      <div className="pt-8 h-full">
        <Main />
      </div>
    </main>
  );
}
