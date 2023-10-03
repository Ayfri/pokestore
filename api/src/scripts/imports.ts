import type {Prisma} from '@prisma/client';
import cards from '../../resources/cards.json';
import pokemons from '../../resources/pokemons.json';
import sets from '../../resources/sets.json';
import prisma from '../prisma.ts';
import {newId} from '../random.ts';

const prismaClient = prisma();

async function pushSets() {
	console.log(`Pushing ${sets.length} sets`);
	await prismaClient.sets.createMany({
		data: sets.map((set) => ({
			id: newId(),
			imageUrl: set.logo,
			name: set.name,
		})),
	});
}

async function pushPokemons() {
	console.log(`Pushing ${pokemons.length} pokemons`);
	await prismaClient.pokemons.createMany({
		data: pokemons.map((pokemon) => ({
			id: newId(),
			description: pokemon.description,
			name: pokemon.name.replace(/ [♀♂] /, ''),
			numero: parseInt(pokemon.num),
			type: pokemon.type.join(','),
		})),
	});
}

async function pushCards() {
	console.log(`Pushing ${cards.length} cards`);
	const pokemons = await prismaClient.pokemons.findMany();
	const [data] = await Promise.all([
		cards.map((pokemonCards) => pokemonCards.map(async (card) => {
			const set = await prismaClient.sets.findFirst({
				where: {
					name: {
						contains: card.set_name,
					}
				},
			});

			const pokemon = pokemons.find((pokemon) => card.name.toLowerCase().includes(pokemon.name.toLowerCase()));

			if (set === null || !pokemon) {
				console.log(`Missing set or pokemon for card '${card.name}', set '${card.set_name}', pokemon '${card.name}', found set '${set?.name}', found pokemon '${pokemon?.name}'`);
				return null;
			}

			if (!card.rarity) {
				console.log(`Missing rarity for card '${card.name}', set '${card.set_name}', pokemon '${card.name}'`);
			}

			return ({
				id: newId(),
				imageUrl: card.image,
				pokemonId: pokemon.id,
				price: card.price || null,
				rarity: card.rarity || "Unknown",
				setId: set.id,
				types: card.types.replace(' ', ''),
			});
		})).flat(),
	]);

	const result = (await Promise.all(data)).filter((card) => card !== null) as Array<Prisma.CardsCreateManyInput>;

	await prismaClient.cards.createMany({
		data: result,
	});
}

async function removeAll() {
	await prismaClient.pokemons.deleteMany({});
	await prismaClient.sets.deleteMany({});
	await prismaClient.cards.deleteMany({});
}

export async function migrate() {
	await removeAll();
	await pushSets();
	await pushPokemons();
	await pushCards();
}
