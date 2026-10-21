import "./Layout.css";
import Sidebar from "./Sidebar";

interface Props {

    children: React.ReactNode;

}

export default function Layout({
    children
}: Props) {

    return (

        <div className="layout">

            <Sidebar />

            <main className="content">

                {children}

            </main>

        </div>

    );

}