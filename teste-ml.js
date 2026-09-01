require('dotenv').config();
const { converterMercadoLivre } = require('./src/mercadolivre.js');

converterMercadoLivre('https://www.mercadolivre.com.br/p/MLB66637233?pdp_filters=item_id:MLB4555189589&matt_tool=38524122#origin=share&sid=share&wid=MLB4555189589&action=copy')
  .then(link => console.log('Resultado:', link))
  .catch(err => console.error('Erro:', err));