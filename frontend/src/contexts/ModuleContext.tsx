import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import type {
    ReactNode
} from "react";

import type {
    ModuleType
} from "../types/module";

interface ModuleContextData {

    selectedModule: ModuleType;

    setSelectedModule: (
        module: ModuleType
    ) => void;

}

const ModuleContext =
    createContext<
        ModuleContextData | undefined
    >(undefined);

export function ModuleProvider({
    children
}: {
    children: ReactNode
}) {

    const [
        selectedModule,
        setSelectedModule
    ] = useState<ModuleType>(
        () =>
            (
                localStorage.getItem(
                    "selectedModule"
                ) as ModuleType
            ) || "MODEM"
    );

    useEffect(() => {

        localStorage.setItem(
            "selectedModule",
            selectedModule
        );

    }, [selectedModule]);

    return (

        <ModuleContext.Provider
            value={{
                selectedModule,
                setSelectedModule
            }}
        >

            {children}

        </ModuleContext.Provider>

    );

}

export function useModule() {

    const context =
        useContext(ModuleContext);

    if(!context){

        throw new Error(
            "useModule deve estar dentro de ModuleProvider"
        );

    }

    return context;

}
