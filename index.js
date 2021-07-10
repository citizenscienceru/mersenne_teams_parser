/*
    Парсер данных с сайта https://www.mersenne.org/report_top_teams/
*/
const fs = require('fs');

const fetch = require('fetch');
const cheerio = require('cheerio');
const alasql = require('alasql');
const YAML = require('yaml');



const genNews = (newsText) => { // функция генерации новостей
    // генерация на сайт
// console.log('gennews');
    fs.readFile('../../source/_data/news.yml', 'utf8' , (err, data) => {
        if (err) {
            throw(err);
        }

        let news =YAML.parse(data); // массив с новостями в виде json
        // формирование новой новости
        let newNews = {};
        newNews.type = "Новость";
        newNews.pub_date = mysqlCurrentDateTime() + "";
        newNews.title = "Простые числа Мерсене - положение команды"
        newNews.source_url = "";
        newNews.author = "Робот";
        newNews.description = newsText;
  
        news.unshift(newNews);
        // сохранение новости
        fs.writeFile('../../source/_data/news.yml', YAML.stringify(news), (err) => {
            if (err) throw err;
            console.log('Data written to file');
        });
    });
    // генерация в твиттер
    // генерация в TG канал

};



// Настройка fetch
const fetchUrlTeams = 'https://www.mersenne.org/report_top_teams/'; // ссылка на страницу с топ командами
const fetchOptions = {
    headers: {
        "User-Agent": "citizenscience.ru/1.0",
        "X-Contact": "contact@citizenscience.ru"
    }
};

fetch.fetchUrl(fetchUrlTeams, fetchOptions, (error, meta, body) => {
    if (!error) {
        let flag = false; // флаг, что нашел citizenscience.ru
        let data = {}; // здесь будут данные о текущем положении

        const $ = cheerio.load(body.toString());
        $('table').each((i, elem) => {
            if (i === 1) { // нужная нам табличка
                const $1 = cheerio.load(elem);
                $1('tr').each((i, elem) => {
                    const $2 = cheerio.load(elem);
                    
                    if (!flag) {
                        $2('td').each((i, elem) => {
                            const $3 = cheerio.load(elem);
                            const text = $3.text();
                            if (i === 0) { // позиция в рейтинге
                                data.position = text;
                            } else if (i === 1) { // название команды
                                if (text === 'citizenscience.ru') {
                                    flag = true;
                                    // console.log(data);
                                }
                            } else if (i === 2) { // Ghz/day
                                data.ghz = text;
                            } else if (i === 3) { // rank-90
                                data['90'] = text;
                            } else if (i === 4) { // rank-30
                                data['30'] = text;
                            } else if (i === 5) { // rank-7
                                data['7'] = text;
                            } else if (i === 6) { // rank-1
                                data['1'] = text;
                            }
                        })
                    }
                })
            }
        });

        data.date = mysqlCurrentDateTime();
        // смотрим последнее записанное значение и если различаются - записываем
        let positionData = require('./position.json'); // json как бд с изменением позиций
        const res = alasql('select position from ? order by date desc limit 1', [positionData]);
        
        if (res[0].position !== data.position) {
            // постим новость, что позиция изменилась
            let newsText = '';
            if (res[0].position < data.position) { // опустились :(
                newsText = `К сожалению, другая команда выделила больше ресурсов и обогнала нас (citizenscience.ru). Теперь наша команда занимает ${data.position} место. Пригласите друзей или выделите больше ресурсов, пожалуйста!`
            } else if (res[0].position > data.position) { // поднялись!
                newsText = `Наша команда (citizenscience.ru) поднялась в рейтинге топ команд по вычислению простых чисел Мерсене на ${data.position} место! Так держать! Спасибо Вам за участие!`
            };
            if (newsText.length > 0) {
                // запускаем генератор сайта
                genNews(newsText);
                // запускаем публикацию сайта
            };

            // сохраняем текущие данные
            positionData.push(data);
            console.log(positionData);
            fs.writeFile('./position.json', JSON.stringify(positionData), (err) => {
                if (err) throw err;
                console.log('Data written to file');
            });
        }
       
    } else { // не получилось скачать - пофиг
    }
});

//-------------------------------------------------------------------
function mysqlCurrentDateTime() {
    return new Date().toMysqlFormat();
  }
  
  function twoDigits(d) {
    if(0 <= d && d < 10) { return '0' + d.toString(); }
    if(-10 < d && d < 0) { return '-0' + (-1*d).toString(); }
    return d.toString();
  }
  
  Date.prototype.toMysqlFormat = function() {
    return this.getUTCFullYear() + '-' + twoDigits(1 + this.getUTCMonth()) + '-' + twoDigits(this.getUTCDate()) + ' ' + twoDigits(this.getUTCHours()) + ':' + twoDigits(this.getUTCMinutes()) + ':' + twoDigits(this.getUTCSeconds());
  };
  
