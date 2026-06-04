import PocketBase from "pocketbase";
const POCKETBASE_URL = "https://eyeth-pocketbase.lola-brouart.fr";
const pb = new PocketBase(POCKETBASE_URL);
export { pb };

export async function loginUser(email, password) {
    try {
        return await pb.collection("users").authWithPassword(email, password);
    } catch (error) {
        throw error;
    }
}

export async function registerUser(email, password, username) {
    try {
        await pb.collection("users").create({
            email,
            password,
            passwordConfirm: password,
            username,
        });
        return await pb.collection("users").authWithPassword(email, password);
    } catch (error) {
        throw error;
    }
}

export async function getPacks(collection = "packs") {
    try {
        return await pb.collection(collection).getFullList();
    } catch (e) {
        console.error("Erreur lors de la récupération des événements :", e);
        return [];
    }
}

export async function onePack(id) {
    try {
        return await pb.collection("packs").getOne(id);
    } catch (e) {
        console.error(e);
    }
}

export async function getMotsForPack(packId) {
    try {
        const composerEntry = await pb.collection('composer').getFirstListItem(`codePack = "${packId}"`);
        const motsIds = composerEntry.idMot;
        if (!motsIds || motsIds.length === 0) return [];

        const filter = motsIds.map(id => `id = "${id}"`).join('||');

        const mots = await pb.collection('mots').getFullList({
            filter: filter,
            sort: 'mot',
        });

        return mots;

    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getMots() {
    try {
        const mots = await pb.collection("mots").getFullList({
            sort: "mot",
        });
        return mots;
    } catch (e) {
        console.error(e);
        return [];
    }
}

export async function getOneMot(id) {
    try {
        const mot = await pb.collection("mots").getOne(id);
        return mot;
    } catch (e) {
        console.error(e);
        return "";
    }
}

export async function getMotsIllustres() {
    try {
        const mots = await pb.collection("mots").getFullList({
            filter: 'illu != ""',
        })
        return mots;
    } catch (e) {
        console.error(e);
        return [];
    }
}





/**
 * Tire `count` mots via l'API APIVerve Random Word,
 * puis retourne ceux qui existent dans getMotsIllustres().
 * Complète avec un fallback aléatoire si pas assez de correspondances.
 */
export async function getMotsAleatoires(count = 3, maxTentatives = 20) {
    const catalogue = await getMotsIllustres();
    const index = new Map(catalogue.map((m) => [m.mot.toLowerCase(), m]));

    const selection = [];
    const dejaPris = new Set();
    let tentatives = 0;

    while (selection.length < count && tentatives < maxTentatives) {
        tentatives++;
        try {
            const res = await fetch('https://api.apiverve.com/v1/randomwords', {
                headers: {
                    'X-API-Key': import.meta.env.APIVERVE_KEY,
                    'Content-Type': 'application/json',
                },
            });
            if (!res.ok) continue;
            const json = await res.json();
            const mot = json?.data?.word?.toLowerCase();
            if (!mot || dejaPris.has(mot)) continue;
            const found = index.get(mot);
            if (found) {
                dejaPris.add(mot);
                selection.push(found);
            }
        } catch {
            // Continue silencieusement sur erreur réseau
        }
    }

    // Fallback : compléter avec des mots aléatoires du catalogue
    if (selection.length < count) {
        const restants = catalogue.filter((m) => !dejaPris.has(m.mot.toLowerCase()));
        const fallback = restants.sort(() => Math.random() - 0.5).slice(0, count - selection.length);
        selection.push(...fallback);
    }

    return selection;
}