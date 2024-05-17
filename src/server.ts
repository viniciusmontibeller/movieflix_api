import express from "express";
import { PrismaClient } from "@prisma/client";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "../swagger.json";

const port = 3000;
const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/movies", async (_, res) => {
    const movies = await prisma.movie.findMany({
        orderBy: {
            title: "asc",
        },
        include: {
            genres: true,
            languages: true,
        }
    });
    res.json(movies);
});

app.post("/movies", async (req, res) => {

    const { title, genre_id, language_id, oscar_count, release_date } = req.body;

    try {
        //case insensitive se não faz diferenca o tipo da primeira letra
        const movieWithSameTitle = await prisma.movie.findFirst({
            where: { title: { equals: title, mode: "insensitive" } },
        });

        if (movieWithSameTitle) {
            return res.status(409).send({ message: "Ja existe um filme cadastrado com esse título" });
        }

        await prisma.movie.create({
            data: {
                title,
                genre_id,
                language_id,
                oscar_count,
                release_date: new Date(release_date)
            }
        });
    } catch (error) {
        return res.status(500).send({ message: "Falha ao cadastrar um filme" });
    }

    res.status(201).send();
});

app.put("/movies/:id", async (req, res) => {
    //pegar o id do registro que vai seer atualizado
    //pegar os dados do filme que sera atualizado e atualizar ele com o prisma
    //retornar o status correto informando que o filme foi atualizado
    console.log(req.params.id);
    const id = Number(req.params.id);

    try {
        const movie = await prisma.movie.findUnique({
            where: {
                id,
            }
        });

        if (!movie) {
            return res.send(404).send({ message: "Filme não encontrado" });
        }

        const data = { ...req.body };
        data.release_date = data.release_date ? new Date(data.release_date) : undefined;

        await prisma.movie.update({
            where: {
                id,
            },
            data: data,
        });
    } catch (error) {
        return res.status(500).send({ message: "Falha ao atualizar o resgistro do filme" });
    }
    res.status(200).send();
});

app.delete("/movies/:id", async (req, res) => {
    const id = Number(req.params.id);

    try {
        const movie = await prisma.movie.findUnique({ where: { id } });

        if (!movie) {
            return res.status(404).send({ message: "O filme não foi encontrado" });
        }

        await prisma.movie.delete({ where: { id } });
    } catch (error) {
        return res.status(500).send({ message: "Não foi possível remover o filme" });
    }

    res.status(200);
});

app.get("/movies/:genreName", async (req, res) => {
    //receber o nome do gênero pelo parametro da rota
    console.log(req.params.genreName);

    //filtrar os filmes do banco pelo genero
    try {
        const moviesFilteredByGenreName = await prisma.movie.findMany({
            include: {
                genres: true,
                languages: true,
            },
            where: {
                genres: {
                    name: {
                        equals: req.params.genreName,
                        mode: "insensitive",
                    },
                }
            }
        });
        //retornar os filmes filtrados na resposta da rota
        res.status(200).send(moviesFilteredByGenreName);
    } catch (error) {
        res.status(500).send({ message: "Falaha ao filtrar filmes por gênero" });
    }
});

app.get("/genres", async (_, res) => {
    try {
        const genres = await prisma.genre.findMany({
            orderBy: {
                name: "asc",
            },
        });
        res.json(genres);
    } catch (error) {
        res.status(500).send({ message: "Falaha ao buscar os gêneros" });
    }
});

app.post("/genres", async (req, res) => {
    const { name } = req.body;

    if (!name) {
        res.status(400).send({ message: "O nome do gênero é obrigatórtio" });
    }

    try {
        const genreWithSameName = await prisma.genre.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: "insensitive"
                }
            }
        });

        if (genreWithSameName) {
            res.status(409).send({ message: "Esse gênero ja existe" });
        }

        const newGenre = await prisma.genre.create({
            data: {
                name
            }
        });

        res.send(201).json(newGenre);
    } catch (error) {
        res.status(500).send({ messsage: "Não foi possível adicionar um novo gênero" });
    }
});

app.put("/genres/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { name } = req.body;

    if (!name) {
        return res.status(400).send({ message: "O nome do gênero é orbigatório" });
    }

    try {
        const genre = await prisma.genre.findUnique({ where: { id } });

        if (!genre) {
            return res.send(404).send({ message: "Gênero não encontrado" });
        }

        const existingGenre = await prisma.genre.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: "insensitive"
                },
                id: {
                    not: id
                }
            }
        });

        if (existingGenre) {
            return res.status(409).send({ message: "Esse nome de gênero ja existe" });
        }

        const updatedGnere = await prisma.genre.update({
            where: { id },
            data: { name }
        });

        res.status(200).json(updatedGnere);
    } catch (error) {
        res.status(500).send({ message: "Falha ao atualizar o gênero" });
    }
});

app.delete("/genres/:id", async (req, res) => {
    const id = Number(req.params.id);

    try {
        const genre = await prisma.genre.findUnique({ where: { id } });

        if (!genre) {
            return res.status(404).send({ message: "GÊnero não encontrado" });
        }

        await prisma.genre.delete({ where: { id } });

        res.status(200).send({ message:  "Genero removido com sucesso"});
    } catch (error) {
        res.status(500).send({ message: "Não foi possível remover o gênero" });
    }
});

app.listen(port, () => {
    console.log(`Servidor em execução na porta ${port}`);
});