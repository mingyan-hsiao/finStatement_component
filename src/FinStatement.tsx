import {
  AppliedPrompts,
  Context,
  onDrillDownFunction,
  ResponseData,
  TContext
} from '@incorta-org/component-sdk';
import React from 'react';
import { tidy, pivotLonger, mutate,fullJoin,leftJoin, groupBy, summarize, sum, filter, last } from '@tidyjs/tidy'
import './App.css';

  
interface Props {
  context: Context<TContext>;
  prompts: AppliedPrompts;
  data: ResponseData;
  drillDown: onDrillDownFunction;
}

const FinStatement = ({ context, prompts, data, drillDown }: Props) => {
  console.log(data)
  
  /***** Gets dimentions and measures columns Start  */
  const dims =
  data.rowHeaders?.map(cell => {
    return { field: cell.id, header: cell.label, type: 'dimention' };
  }) ?? [];
  const maasures = data.measureHeaders.map(cell => {
  return { field: cell.id, header: cell.label, type: 'measure' };
  });
  const cols = dims.concat(maasures);
  /***** Gets dimentions and measures columns End  */
  // only get the header
  let colsName = cols.map(a => a.header);
  let maasureName = maasures.map(a => a.header);

  let _rawData = data.data.map((col: any) => {
    let colsName = col;
    return colsName
  });
 
  // create an empty array
  const raw_input: any[] = []
  _rawData.map(function(d){
    let r = {}
    for(let i = 0; i < colsName.length; i++){ 
      r[colsName[i]] = d[i].formatted
    }
    raw_input.push(r) // append array
    })
  console.log("r")
  console.log(raw_input);
  

/***** Same as version 1  */
  // sample input
  //   const dt = [
  //     { period: 'one', rev: 1, cost: 10, disc: 4},
  //     { period: 'two', rev: 7, cost: 3, disc: 11},
  //     { period: 'three', rev: 20, cost:7, disc:7 },
  //   ];

  
  // unpiviot
  let dt = tidy(
      raw_input,
      pivotLonger({
        cols: maasureName,
        namesTo: 'item',
        valuesTo: 'amount',
      })
    );
  console.log("dt")
  console.log(dt)

  // change amount data type to float
  dt.map(function(d){
    d.Period = parseFloat(d.Period);
    d.amount = parseFloat(d.amount);
  })
  
  // aggrrgate
  let new_dt = tidy(
    dt,
    groupBy(['Period', 'item'], [
      summarize({ total: sum('amount') })
    ])
  )
  console.log("new");
  console.log(new_dt);

  let curr = 2022
  let currdata = tidy(new_dt, filter((d) => d.Period === curr))
  let lastdata = tidy(new_dt, filter((d) => d.Period === curr-1))
  // change the key name of last year data
  let lastyrdata = lastdata.map(({
    total: totallast,
    ...rest
  }) => ({
    totallast,
    ...rest
  }));
  

// left join
let twodata = tidy(currdata,
    leftJoin(lastyrdata, { by: 'item' }))

// growth rate
function formatAsPercent(num:number) {
    return `${Math.floor(num*100)}%`;}
console.log("curr revenue")
console.log(twodata.at(0)?.total)


let curr_rev = twodata.at(0)?.total

let ratio_dt = tidy(twodata, mutate({
  rate: (d: any) => formatAsPercent((d.total - d.totallast)/d.totallast),
  curr_ratio: (d: any)=> formatAsPercent(d.total/curr_rev),
  last_ratio: (d: any)=> formatAsPercent(d.totallast/twodata.at(0)?.totallast)
}
  ))
  
console.log("test0222");
console.log(ratio_dt);


  const DisplayData=ratio_dt.map(
    (info)=>{
        return(
            <tr>
                
                <td>{info.item}</td>
                <td>{info.total}</td>
                <td>{info.curr_ratio}</td>
                <td>{info.totallast}</td>
                <td>{info.last_ratio}</td>
                <td>{info.rate}</td>
            </tr>
        )
    }
  )


  return (
    <div><h2>2022 Income Statement</h2>
            <table id="customers">
                <thead>
                    <tr>

                  
                    <th>Item</th>
                    <th>Current year</th>
                    <th>Current ratio</th>
                    <th>Last year</th>
                    <th>Last ratio</th>
                    <th>Percentage Change</th>


                    </tr>

                </thead>

                <tbody>          
                 
                    {DisplayData}

                </tbody>

            </table>
        
      </div>
    );
 
};

export default FinStatement;
