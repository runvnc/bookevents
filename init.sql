-
--create or replace function vwap(offers float[][], vol float) returns float as $$
--declare
--  sumprice float := 0 ;
--  sumvol float := 0 ;
--  price float := 0 ;
--  cvol float := 0 ;
--  i float := 1;
--  done boolean := false;
--begin
-- loop
--    exit when done;
--    price := offers[i][1] ;
--    cvol := offers[i][2] ;
--    if vol > 0 and sumvol >= vol then
--      cvol := vol - sumvol;      
--      done := true;
--    end if;
--
--    sumprice := sumprice + price * cvol ;
--    sumvol := sumvol + cvol ;
--    i := i + 1;
--    if i > array_length(offers, 1) then done := true ; end if;
-- end loop ;
-- return sumprice / sumvol;
--end; 
--$$ language plpgsql;
--

drop function vwap;

create or replace function vwap(offers float[][], bucketsize float) returns float as $$
declare
  weightedprice float := 0 ;
  totalvol float := 0 ;
  price float := 0 ;
  ivol float := 0 ;
  ind float := 1;
  used float := 0;
  done boolean := false;
begin
 loop
    exit when done;
    if ind > array_length(offers, 1) then done := true ;
    else
      price := offers[ind][1];
      vol := offers[ind][2];
      vol := vol - used;
      if vol < bucketsize then
         weightedprice += price * vol;
         totalvol += vol;
    end if;
    
 end loop ;
 return sumprice / sumvol;
end; 
$$ language plpgsql;

-

--drop table books;

--create table books (
--  time timestamp default current_timestamp,
--  exchange varchar(10),
--  symbol varchar(10),
 -- asks float[],
--  bids float[],
--  vwap_bids float,
--  vwap_asks float
--);


--create table bookparams (
--  exchange varchar(10),
--  params json
--);

--create table exchangepairs (
--  exchange varchar(10),
--  theirpair varchar(10),
--  ourpair varchar(10)
--);


