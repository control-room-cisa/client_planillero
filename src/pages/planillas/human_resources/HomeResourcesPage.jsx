import * as React from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import CardMedia from "@mui/material/CardMedia";
import tinycolor from "tinycolor2";
import { Typography } from "@mui/material";
import { Link } from "react-router-dom";

const cardsData = [
  {
    title: "Card 1",
    image: "/assets/imagenes/logo_fincasa.jpg",
    link: "/FINCASA",
  },
  {
    title: "Card 2",
    image: "/assets/imagenes/logo_arrayan.jpg",
    link: "/ARRAYÁN",
  },
  {
    title: "Card 3",
    image: "/assets/imagenes/logo_durri.jpg",
    link: "/DURRIKIKARÁ",
  },
  {
    title: "Card 4",
    image: "/assets/imagenes/logo_copenergy.jpg",
    link: "/COPENERGY",
  },
  {
    title: "Card 5",
    image: "/assets/imagenes/logo_idsa.jpg",
    link: "/IDSA",
  },
  {
    title: "Card 6",
    image: "/assets/imagenes/logo_lynx.jpg",
    link: "/LYNX",
  },
  {
    title: "Card 7",
    image: "/assets/imagenes/logo_CISA.png",
    link: "/CISA",
  },
];

const colors = [
  "#FFCDD2",
  "#C8E6C9",
  "#BBDEFB",
  "#27548A",
  "#FFE0B2",
  "#B2EBF2",
  "#FFF9C4",
  "#F8BBD0",
];

const HomeResources = () => {
  return (
    <>
      <Box
        sx={{
          alignContent: "center",
          textAlign: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          sx={{ fontSize: 40, fontWeight: "bold", fontFamily: '"Segoe UI"' }}
        >
          Recursos Humanos, Sistema Planillero
        </Typography>
      </Box>
      <Box sx={{ flexGrow: 1, padding: 2, maxWidth: 1250, }}>
        <Grid container spacing={6}>
          {cardsData.map((card, index) => {
            const bgColor = colors[index % colors.length];
            const hoverColor = tinycolor(bgColor).darken(15).toString();

            return (
              <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                <Link to={card.link} style={{ textDecoration: "none" }}>
                  <Card
                    sx={{
                      borderRadius: 2,
                      cursor: "pointer",
                      maxWidth: 350,
                      margin: "0 auto",
                      backgroundColor: bgColor,
                      transition: "background-color 0.3s ease",
                      "&:hover": {
                        backgroundColor: hoverColor,
                      },
                    }}
                  >
                    <CardMedia
                      component="img"
                      image={card.image}
                      alt={card.title}
                      sx={{
                        width: {
                          xs: "95%",
                          sm: "95%",
                          md: "95%",
                          lg: "92%",
                          xl: "95%"
                        },
                        height: {
                          xs: 190,
                          sm: 190,
                          md: 190,
                          lg: 190,
                          xl: 250
                        },
                        padding: 1,
                        borderRadius: 4,
                      }}
                    />

                    <CardActions sx={{ justifyContent: "center" }}>
                      <Button
                        size="small"
                        color="black"
                        sx={{
                          fontSize: 20,
                          fontWeight: "bold",
                          fontFamily: '"Segoe UI Emoji"',
                        }}
                      >
                        Ver nominas
                      </Button>
                    </CardActions>
                  </Card>
                </Link>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    </>
  );
};

export default HomeResources;
