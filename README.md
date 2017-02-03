# Datagrid Column Search

## Description

This Mendix widget adds interactive in-column searching to the Mendix data grid. Filters work in an "AND" configuration, just like Excel.

![Not Searching](https://github.com/tieniber/DataGridColumnSearch/blob/master/assets/Normal.png)

![Searching](https://github.com/tieniber/DataGridColumnSearch/blob/master/assets/Searching.png)

## Contributing

For more information on contributing to this repository visit [Contributing to a GitHub repository](https://world.mendix.com/display/howto50/Contributing+to+a+GitHub+repository)!

## Configuration

To use this widget, simply drop it on a page with a data grid and set 2 properties:
 - Grid Name: the "name" property of the data grid you want to have search fields
 - Grid Entity: the entity show in the data grid

## Supported Data Types

The following data types are supported:
 - String
 - Integer
 - Long
 - Date
 - Enumeration
 - Boolean
 - AutoNumber

## Supported Mendix versions and browsers

Testing was completed in Mendix 5.21.4 and Mendix 6.10.3, on Chrome, IE, Firefox, and Edge.

## Limitations

This widget only works with data grids that source their data via XPath. This is required because the live searching feature sends new search commands directly to the application's database as you type.
