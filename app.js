const express = require('express');

const data = {
    champions: require('./data/champions.json'),
    synergies: require('./data/synergies.json'),
    items: require('./data/items.json'),
};

const app = express();
app.use(express.json());
app.use(express.static(`wwwroot`));
app.use(express.static(`data`));

app.post(`/sim`, (req, res) => {
    const { champions, items } = req.body;
    const fullChampions = Object.keys(champions).map((championId) => data.champions.find((champion) => champion.id == championId));
    
    // Synergies: Check the number of synergies of current lineup
    const synergies = fullChampions.reduce((synergies, fullChampion) => {
        const champion = data.champions.find((champion) => champion.id == fullChampion.id);

        champion.synergies.forEach((synergy) => {
            synergies[synergy] = (synergies[synergy] || 0) + 1;
        });

        return synergies;
    }, {});

    // Synergy Buffs: Check for buffs of current lineup
    const draftBuffs = Object.keys(synergies).reduce((draftBuffs, synergyId) => {
        const combinedSynergies = Object.keys(data.synergies).reduce((mapped, key) => {
            return [ ...mapped, ...data.synergies[key] ];
        }, []);

        // const { id, levels, effects } = combinedSynergies.find((synergy) => synergy.id == synergyId);
        const synergy = combinedSynergies.find((synergy) => synergy.id == synergyId);

        const synergyBuff = {
            ...synergy,
            level: 0,
            champions: {
                all: data.champions.filter((champion) => champion.synergies.includes(synergyId)).sort((a, b) => {
                    if(a.cost > b.cost
                        || a.cost == b.cost && a.id > b.id)
                        return 1;

                    return -1;
                }).map((champion) => champion.id),
                owned: fullChampions.filter((champion) => champion.synergies.includes(synergyId)).sort((a, b) => {
                    if(a.cost > b.cost
                        || a.cost == b.cost && a.id > b.id)
                        return 1;

                    return -1;
                }).map((champion) => champion.id)
            }
        };

        synergy.effects.forEach((effect) => {
            const { min, max } = effect.combinations;
            
            if((!min || min <= synergies[synergyId]) && (!max || max >= synergies[synergyId]))
                synergyBuff.level = effect.level;
        });

        draftBuffs = [ ...draftBuffs, synergyBuff ];
        return draftBuffs;
    }, []);

    const buffs = draftBuffs.slice().sort((a, b) => {
        if((a.level / a.levels) < (b.level / b.levels)
            || (a.level / a.levels) == (b.level / b.levels) && a.levels < b.levels
            || (a.level / a.levels) == (b.level / b.levels) && a.levels == b.levels && a.id > b.id)
            return 1;

        return -1;
    });

    // New Items: Combine possible Advance Items
    const newItems = data.items.filter((item) => item.recipes).reduce((newItems, currentItem) => {
        if (Object.keys(currentItem.recipes).every((recipe) => {
            return currentItem.recipes[recipe] <= items[recipe];
        }))
            newItems = [ ...newItems, currentItem.id ];

        return newItems;
    }, []);

    res.json({
        synergies,
        buffs,
        newItems
    });
});

app.get(`/champions`, (req, res) => res.json(data.champions));
app.get(`/champions/:id`, (req, res) => res.json(data.champions.find((champion) => champion.id == req.params.id)));
app.get(`/items`, (req, res) => res.json(data.items));
app.get(`/items/:id`, (req, res) => res.json(data.items.find((item) => item.id == req.params.id)));
app.get(`/synergies`, (req, res) => res.json(data.synergies));
app.get(`/synergies/:id`, (req, res) => {
    const combinedSynergies = Object.keys(data.synergies).reduce((mapped, key) => {
        return [ ...mapped, ...data.synergies[key] ];
    }, []);

    res.json(combinedSynergies.find((synergy) => synergy.id == req.params.id));
});

app.listen(3000, () => console.log(`Listening`));