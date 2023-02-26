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
  
  // Gets dimentions and measures columns 
  const dims = data.rowHeaders?.map(cell => {
    return { field: cell.id, header: cell.label, type: 'dimention' };
  }) ?? [];
  const maasures = data.measureHeaders.map(cell => {
  return { field: cell.id, header: cell.label, type: 'measure' };
  });
  const cols = dims.concat(maasures);
  // only get the header name 
  let colsName = cols.map(a => a.header);
  let maasureName = maasures.map(a => a.header);

  // get data from Incorta and put into array
  let _rawData = data.data.map((col: any) => {
    let colsName = col;
    return colsName});
 
  // adjust the key name with colsName 
  const raw_input: any[] = []
  _rawData.map(function(d){
    let r = {}
    for(let i = 0; i < colsName.length; i++){ 
      r[colsName[i]] = d[i].formatted}
    raw_input.push(r) // append array
    })

  // unpiviot the column into: period, item, amount 
  let dt = tidy(
      raw_input,
      pivotLonger({
        cols: maasureName,
        namesTo: 'item',
        valuesTo: 'amount',
      })
    );

  // change data type to float for agregation 
  dt.map(function(d){
    d.Period = parseFloat(d.Period);
    d.amount = parseFloat(d.amount);})
  
  // agregation by period and item 
  let new_dt = tidy(
    dt,
    groupBy(['Period', 'item'], [summarize({ total: sum('amount') })]))
  
  // fixe the input current year, will be revised in the next steps
  let curr = 2022
  let currdata = tidy(new_dt, filter((d) => d.Period === curr))
  let lastdata = tidy(new_dt, filter((d) => d.Period === curr-1))
  // change the key name of last year data
  let lastyrdata = lastdata.map(({
    total: totallast,
    ...rest}) => ({
    totallast, ...rest
  }));
  
  // left join two years' data 
  let twodata = tidy(currdata,
      leftJoin(lastyrdata, { by: 'item' }))

  // add percentage change rate between two years
  function formatAsPercent(num:number) {
      return `${Math.floor(num*100)}%`;}

  let ratio_dt = tidy(twodata, mutate({
    rate: (d: any) => formatAsPercent((d.total - d.totallast)/d.totallast),
    // non-null assertion operator to ensure it is number type
    curr_ratio: (d: any)=> formatAsPercent(d.total/twodata.at(0)?.total!),
    last_ratio: (d: any)=> formatAsPercent(d.totallast/twodata.at(0)?.totallast!)
  }))
  
  console.log("output");
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
