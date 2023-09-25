const mysql = require('mysql2');
const XLSX = require('xlsx');
const Constants = require('./Constants')

const db = mysql.createConnection({
  host: Constants.db_host,
  user: Constants.db_user,
  password: Constants.db_pass,
  database: Constants.db_name
});

db.connect(function(err){
  if(err) throw err;
  Connected = true;
  console.log("DB: Connected!");

  readData();
});

function getTimeStamp(){
  let date = new Date();

  return "\'" + date.getFullYear() + "-" + ("0" + (date.getMonth() + 1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2) + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "\'";
}

function readData(){
  var workbook = XLSX.readFile('./xlsx/01-08-23_31-08-23.xls');
  var sheet_name_list = workbook.SheetNames;
  var xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
  let Conti, Categorie;


  let sql ="SELECT idConto, nome FROM Conti WHERE isDeleted = 0;";
  db.query(sql, function (err, result) {
    if (err) throw err;
    //console.log(result);
    Conti = result;
    
    let sql ="SELECT idCategoria, nome FROM Categorie WHERE isDeleted = 0;";
    db.query(sql, function (err, result) {
      if (err) throw err;
      //console.log(result);
      Categorie = result;


      for(let i = 0; i < xlData.length; i++){
        let stringData = JSON.stringify(xlData[i]);
        stringData = stringData.replace('Sotto-categoria', 'SottoCategoria');
        stringData = stringData.replace('Guadagni/Spese', 'GuadagniSpese');
        let jsonData = JSON.parse(stringData);

        //console.log(jsonData);
        let dateTime = getDate(jsonData.Giorno);
        if(dateTime > '2023-04-31 23:59:59'/* && dateTime < '2023-07-01 00:00:00'*/){
          let idContoFrom = findConto(Conti, jsonData.Conto);
          if(jsonData.GuadagniSpese == 'Spesa'){
            let idCategoria = findCategoria(Categorie, jsonData.SottoCategoria);
            if(idCategoria == null){
              idCategoria = findCategoria(Categorie, jsonData.Categoria);
            }
            if(idCategoria == null){
              console.log("Nessuna categoria per " + jsonData.Categoria);
            }
            sql = "INSERT INTO Transazioni (dateTime, importo, idCategoria, idContoFrom, idCurrency, nota, descrizione) VALUES (\'" + dateTime + "\', " + jsonData.Importo + ", " + idCategoria + ", " + idContoFrom + ", 1, \"" + jsonData.Nota + "\", \""+ jsonData.Nota_1 +"\");";
            //console.log(jsonData.GuadagniSpese + ": " + sql);
          }
          else if(jsonData.GuadagniSpese == 'Guadagno'){
            let idCategoria = findCategoria(Categorie, jsonData.SottoCategoria);
            if(idCategoria == null){
              idCategoria = findCategoria(Categorie, jsonData.Categoria);
            }
            if(idCategoria == null){
              console.log("Nessuna categoria per " + jsonData.Categoria);
            }
            sql = "INSERT INTO Transazioni (dateTime, importo, idCategoria, idContoFrom, idCurrency, nota, descrizione) VALUES (\'" + dateTime + "\', " + jsonData.Importo + ", " + idCategoria + ", " + idContoFrom + ", 1, \"" + jsonData.Nota + "\", \""+ jsonData.Nota_1 +"\");";
            //console.log(jsonData.GuadagniSpese + ": " + sql);
          }
          else if(jsonData.GuadagniSpese == 'Trasferimento uscita'){
            idContoTo = findConto(Conti, jsonData.Categoria);
            if(idContoTo != null){
              sql = "INSERT INTO Transazioni (dateTime, importo, idContoFrom, idContoTo, idCurrency, nota, descrizione) VALUES (\'" + dateTime + "\', " + jsonData.Importo + ", " + idContoFrom + ", " + idContoTo + ", 1, \"" + jsonData.Nota + "\", \""+ jsonData.Nota_1 +"\");";
              //console.log("Trasf: " + sql);
            }
            else{
              console.log("Conto " + jsonData.Categoria + " non trovato");
            }
          }
          else {
            console.log("altro");
          }
          console.log("Fine: " + sql);
          db.query(sql, function (err, result) {
            if (err) throw err;
            console.log(result);
          });
        }
      }
    });
  });
}

function findCategoria(Categorie, nome){
  for(let i = 0; i < Categorie.length; i++){
    if(nome == Categorie[i].nome){
      return Categorie[i].idCategoria;
    }
  }
}

function findConto(Conti, nome){
  for(let i = 0; i < Conti.length; i++){
    if(nome == Conti[i].nome){
      return Conti[i].idConto;
    }
  }
  return null;
}

function getDate(old){
  newData = old[6] + old[7] + old[8] + old[9] + '-' + old[3] + old[4] + '-' + old[0] + old[1] + ' ';
  for(let i = 11; i < 19; i++){
    newData += old[i];
  }
  return newData;
}