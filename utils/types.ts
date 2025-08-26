export type solutionResult = {
    title: string;
    players: string[];
};

export type dbConnection = {
    playerids: number[];
}

// jank of the jank
export const validLookerStrings = ["leconnections", "hoopgrids", "leconnectionshof"] as const;
export type ValidLookerString = (typeof validLookerStrings)[number];