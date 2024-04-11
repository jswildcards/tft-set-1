const home = Vue.component(`home`, {
    template: /*html*/`
        <div>
            Buffs:

            <h3 v-if="!message.buffs || message.buffs.length <= 0">No Data</h3>

            <div v-else>
                <br>
                <br>
                <li v-for="buff in message.buffs" v-html="formatBuffData(buff)"></li>

                <br>
                <br>
            </div>

            Champions:
            <br>
            <button @click="clearChampions()">Clear</button>
            <br>
            <div v-for="cost in [1, 2, 3, 4, 5]">
                <img v-for="champion in champions.filter((champion) => champion.cost == cost)" @click="selectChampion(champion)" :title="champion.name" :src="'http://ddragon.leagueoflegends.com/cdn/9.15.1/img/champion/' + champion.riotId + '.png'" :class="selectedChampions.includes(champion) ? '' : 'unowned'" width="64">
            </div>

            <br>
            <br>

            Selected Basic Items:
            <br>
            <button @click="clearItems()">Clear</button>

            <h3 v-if="selectedItems.length <= 0">No Selected Items</h3>
            <div v-else>
                <br>
                <img v-for="item in selectedItems" @click="deselectItem(item)" :title="item.name" :src="getItemImg(item)" width="64">
                <br>
                <br>
            </div>
            

            All Basic Items:
            <br>
            <img v-for="item in items.filter((item) => !item.recipes)" @click="selectItem(item)" :title="item.name" :src="getItemImg(item)" width="64">
            <br>
            <br>
            All Advanced Items: 
            <br>

            <div v-for="firstItem in items.filter((item) => !item.recipes)">
                <span v-for="secondItem in items.filter((item) => !item.recipes)">
                    <img @click="deselectAdvancedItem(firstItem, secondItem)" :title="getAdvancedItem(firstItem, secondItem).name" :src="getItemImg(getAdvancedItem(firstItem, secondItem))" :class="!message.newItems || !message.newItems.includes(getAdvancedItem(firstItem, secondItem).id) ? 'unowned' : ''" width="64">
                </span>
                <img :title="firstItem.name" :src="getItemImg(firstItem)" :class="selectedItems.reduce((appearance, item) => appearance += item.id == firstItem.id ? 1 : 0, 0) < 2 ? 'unowned' : ''" width="64">
            </div>
        </div>
    `,
    data: function() {
        return {
            champions: [],
            selectedChampions: [],
            items: [],
            selectedItems: [],
            synergies: [],
            message: ``,
        };
    },
    mounted: function() {
        fetch(`/champions`).then((res) => res.json()).then((res) => this.champions = res);
        fetch(`/synergies`).then((res) => res.json()).then((res) => this.synergies = res);
        fetch(`/items`).then((res) => res.json()).then((res) => this.items = res);
    },
    methods: {
        clearChampions: function() {
            this.selectedChampions = [];
            return fetch(`/sim`, { method: `POST`, headers: { "Content-type": "application/json" }, body: JSON.stringify(this.formatSimData()) }).then((res) => res.json()).then((res) => this.message = res);
        },
        clearItems: function() {
            this.selectedItems = [];
            return fetch(`/sim`, { method: `POST`, headers: { "Content-type": "application/json" }, body: JSON.stringify(this.formatSimData()) }).then((res) => res.json()).then((res) => this.message = res);
        },
        selectChampion: function(champion) {
            if(this.selectedChampions.includes(champion))
                this.selectedChampions.splice(this.selectedChampions.indexOf(champion), 1);
            else
                this.selectedChampions = [ ...this.selectedChampions, champion ];

            return fetch(`/sim`, { method: `POST`, headers: { "Content-type": "application/json" }, body: JSON.stringify(this.formatSimData()) }).then((res) => res.json()).then((res) => this.message = res);
        },
        selectItem: function(item) {
            this.selectedItems = [ ...this.selectedItems, item ];

            return fetch(`/sim`, { method: `POST`, headers: { "Content-type": "application/json" }, body: JSON.stringify(this.formatSimData()) }).then((res) => res.json()).then((res) => this.message = res);
        },
        deselectItem: function(item) {
            this.selectedItems.splice(this.selectedItems.indexOf(item), 1);

            return fetch(`/sim`, { method: `POST`, headers: { "Content-type": "application/json" }, body: JSON.stringify(this.formatSimData()) }).then((res) => res.json()).then((res) => this.message = res);
        },
        formatSimData: function() {
            const champions = this.selectedChampions.reduce((champions, champion) => {
                return {
                    ...champions,
                    [champion.id]: 1,
                };
            }, {});

            const items = this.selectedItems.reduce((items, item) => {
                items[item.id] = (items[item.id] || 0) + 1;
                return items;
            }, {});

            return {
                champions,
                items,
            };
        },
        formatBuffData: function(buff) {
            return `${buff.name} (${buff.effects.map((effect) => {
                return "<span class='" + (buff.level == effect.level ? '' : 'unowned') + "'>" +  effect.combinations.min + "</span>";
            }).join(`/`)}) : ${buff.description.replace(buff.vars[0], buff.effects.map((effect) => {
                return "<span class='" + (buff.level == effect.level ? '' : 'unowned') + "'>" +  effect.values[buff.vars[0]] + "</span>";
            }).join(`/`))}`;
        },
        getItemImg: function(item) {
            if(item.riotId)
                return `http://ddragon.leagueoflegends.com/cdn/9.15.1/img/item/${item.riotId}.png`;
            else
                return `https://cdn.lolchess.gg/images/tft/item/${item.lolChessId}.png`
        },
        getAdvancedItem: function(firstItem, secondItem) {
            const recipes = [ firstItem, secondItem ].reduce((items, item) => {
                items[item.id] = (items[item.id] || 0) + 1;
                return items;
            }, {});

            return this.items.filter((item) => item.recipes).find((item) => {
                return Object.keys(item.recipes).every((recipe) => {
                    return item.recipes[recipe] <= recipes[recipe];
                });
            });
        },
        deselectAdvancedItem: function(firstItem, secondItem) {
            this.deselectItem(firstItem).then(() => this.deselectItem(secondItem));
        }
    }
});