define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",

    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",
    "dojo/query",
    "dojo/aspect"


], function(declare, _WidgetBase, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent, dojoQuery, dojoAspect) {
    "use strict";

    return declare("DataGridColumnSearch.widget.DataGridColumnSearch", [_WidgetBase], {


        // Internal variables.
        _handles: null,
        _contextObj: null,
        _searchBoxes: null,
        _MS_IN_DAY: 24 * 60 * 60 * 1000,
        _dataType: '',

        constructor: function() {
            this._handles = [];
            this._searchBoxes = [];
        },

        postCreate: function() {
            logger.debug(this.id + ".postCreate");

            var gridNode = dojoQuery(".mx-name-" + this.targetGridName, this.domNode.parentNode)[0];
            if (gridNode) {
                var self = this;
                this._grid = dijit.registry.byNode(gridNode);

                //if grid is loaded, add the search boxes. If not, listen for the postCreate.
                if(this._grid._loaded || (this._grid.isLoaded &&this._grid.isLoaded())) {
                    this._updateRendering();
                } else {
                    dojoAspect.after(this._grid, "postCreate", function(deferred){
                        self._updateRendering();
                        return deferred;
                    });
                }
            } else {
                console.log("Could not find the grid node in postCreate.");
            }
        },

        update: function(obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            var self = this;
            //if the grid refreshes (like in a tab set to reload), re-apply the search
            //this._grid.registerToPluginEvent("triggerOnRefresh", this._doSearch.bind(this), true)
            dojoAspect.after(this._grid, "applyContext", function(deferred, args) {
                self._doSearch();
                return deferred;
            });

            if(callback) callback();
        },

        resize: function(box) {
            logger.debug(this.id + ".resize");
        },

        uninitialize: function() {
            logger.debug(this.id + ".uninitialize");
        },

        _updateRendering: function() {
            logger.debug(this.id + "._updateRendering");

            if (this._grid) {
                this._addSearchBoxes();
                switch (this._grid.config.datasource.type) {
                    case "entityPath":
                    case "microflow":
                        this._dataType = "local";
                        break;
                    case "xpath":
                        this._dataType = "xpath";
                        break;
                    default:
                        this._dataType = "unsupported";
                        break;
                }
            } else {
                console.log("Could not find the grid node in _updateRendering.");
            }
        },
        _addSearchBoxes: function() {
            for (var i = 0; i < this._grid._gridColumnNodes.length; i++) {
                var renderType = this._grid._visibleColumns[i].render
                if (renderType === "String") {
                    this._addStringSearchBox(i, "contains", "search");
                } else if (renderType === "Integer" || renderType === "Long") {
                    this._addStringSearchBox(i, "starts-with", "search");
                } else if (renderType == "Date") {
                    this._addDateSearchBox(i);
                } else if (renderType == "Enum") {
                    this._addEnumSearchBox(i);
                } else if (renderType == "Boolean") {
                    this._addBooleanSearchBox(i);
                }
            }
        },
        _addStringSearchBox: function(i, searchType, inputType) {
            var searchNode = dojoConstruct.create("input");
            var searchAttr = this._grid._visibleColumns[i].tag;
            var searchObj = {
                "attr": searchAttr,
                "node": searchNode,
                "searchType": searchType
            };

            var DOMContainer = this._buildDOMContainer();
            this._grid._gridColumnNodes[i].appendChild(DOMContainer);

            searchNode.type = inputType;
            dojoClass.add(searchNode, "form-control");
            dojoClass.add(searchNode, "dataGridSearchField");

            DOMContainer.appendChild(searchNode);
            this._searchBoxes.push(searchObj);

            this.connect(searchNode, "keyup", "_doSearch");
            this.connect(searchNode, "click", "_ignore");
            this.connect(searchNode, "keypress", "_ignore");
            this.connect(searchNode, "keydown", "_ignore");
            this.connect(searchNode, "keypress", "_escapeReset");
        },
        _addDateSearchBox: function(i) {
            var datePicker = mxui.widget.DatePicker({
                "format": mx.parser.getI18nBundle()["dateFormat-short"],
                "placeholder": mx.parser.getDateFormatPlaceholder({type:"date"}),
                "selector": "date",
                "mode": "date"
            });

            datePicker.buildRendering();
            datePicker.startup();

            var searchNode = datePicker.domNode.children[1].children[0];
            var searchAttr = this._grid._visibleColumns[i].tag;


            var columnEntity = this.gridEntity;
            var currentColumn = this._grid._visibleColumns[i];
            var columnAttribute = currentColumn.attrs[currentColumn.attrs.length - 1];
            if (currentColumn.attrs.length > 1) {
                columnEntity = currentColumn.attrs[currentColumn.attrs.length - 2];
            }

            var localized = false;
            if (mx.meta) {
                localized = mx.meta.getEntity(columnEntity).isLocalizedDate(columnAttribute); //used in 6.10.3
            } else {
                localized = mx.metadata.getEntity(columnEntity).isLocalizedDate(columnAttribute); //used in 5.20
            }

            var searchObj = {
                "attr": searchAttr,
                "node": searchNode,
                "searchType": "date",
                "widget": datePicker,
                "localized": localized
            };
            var DOMContainer = this._buildDOMContainer();
            this._grid._gridColumnNodes[i].appendChild(DOMContainer);

            dojoClass.add(searchNode, "dataGridSearchField");

            DOMContainer.appendChild(datePicker.domNode);
            this._searchBoxes.push(searchObj);

            this.connect(searchNode, "keyup", "_doSearch");
            this.connect(searchNode, "click", "_ignore");
            this.connect(searchNode, "keypress", "_ignore");
            this.connect(searchNode, "keydown", "_ignore");
            this.connect(searchNode, "keypress", "_escapeReset");
            this.connect(datePicker, "onChange", "_doSearch");
        },
        _addEnumSearchBox: function(i) {
            var searchNode = dojoConstruct.create("select");
            var searchAttr = this._grid._visibleColumns[i].tag;
            var searchObj = {
                "attr": searchAttr,
                "node": searchNode,
                "searchType": "equals"
            };

            var columnEntity = this.gridEntity;
            var currentColumn = this._grid._visibleColumns[i];
            var columnAttribute = currentColumn.attrs[currentColumn.attrs.length - 1];
            if (currentColumn.attrs.length > 1) {
                columnEntity = currentColumn.attrs[currentColumn.attrs.length - 2];
            }
            var enumMap;

            if (mx.meta) {
                enumMap = mx.meta.getEntity(columnEntity).getEnumMap(columnAttribute); //used in 6.10.3
            } else {
                enumMap = mx.metadata.getEntity(columnEntity).getEnumMap(columnAttribute); //used in 5.20
            }

            var optionNodeEmpty = dojoConstruct.create("option");
            optionNodeEmpty.innerHTML = "";
            optionNodeEmpty.value = "";
            searchNode.appendChild(optionNodeEmpty);

            for (var j = 0; j < enumMap.length; j++) {
                var optionNode = dojoConstruct.create("option");
                optionNode.innerHTML = enumMap[j].caption;
                optionNode.value = enumMap[j].key;
                searchNode.appendChild(optionNode);
            }

            var DOMContainer = this._buildDOMContainer();
            this._grid._gridColumnNodes[i].appendChild(DOMContainer);

            //searchNode.type = "search";
            //searchNode.placeholder = "(filter)";
            dojoClass.add(searchNode, "form-control");
            dojoClass.add(searchNode, "dataGridSearchField");

            DOMContainer.appendChild(searchNode);
            this._searchBoxes.push(searchObj);

            this.connect(searchNode, "onchange", "_doSearch");
            this.connect(searchNode, "click", "_ignore");
            this.connect(searchNode, "keypress", "_ignore");
            this.connect(searchNode, "keydown", "_ignore");
            this.connect(searchNode, "keypress", "_escapeReset");
        },
        _addBooleanSearchBox: function(i) {
            var searchNode = dojoConstruct.create("select");
            var searchAttr = this._grid._visibleColumns[i].tag;
            var searchObj = {
                "attr": searchAttr,
                "node": searchNode,
                "searchType": "boolean"
            };

            var optionNodeEmpty = dojoConstruct.create("option");
            optionNodeEmpty.innerHTML = "";
            optionNodeEmpty.value = "";
            searchNode.appendChild(optionNodeEmpty);

            var optionNodeTrue = dojoConstruct.create("option");
            optionNodeTrue.innerHTML = "Yes";
            optionNodeTrue.value = "true";
            searchNode.appendChild(optionNodeTrue);

            var optionNodeFalse = dojoConstruct.create("option");
            optionNodeFalse.innerHTML = "No";
            optionNodeFalse.value = "false";
            searchNode.appendChild(optionNodeFalse);

            //searchNode.type = "search";
            //searchNode.placeholder = "(filter)";
            dojoClass.add(searchNode, "form-control");
            dojoClass.add(searchNode, "dataGridSearchField");

            var DOMContainer = this._buildDOMContainer();
            this._grid._gridColumnNodes[i].appendChild(DOMContainer);

            DOMContainer.appendChild(searchNode);
            this._searchBoxes.push(searchObj);

            this.connect(searchNode, "onchange", "_doSearch");
            this.connect(searchNode, "click", "_ignore");
            this.connect(searchNode, "keypress", "_ignore");
            this.connect(searchNode, "keydown", "_ignore");
            this.connect(searchNode, "keypress", "_escapeReset");
        },
        _buildDOMContainer: function() {
            var domContainer = dojoConstruct.create("div");
            dojoClass.add(domContainer, "dataGridSearchContainer");

            var icon = dojoConstruct.create("i");
            this.connect(icon, "click", "_ignore");
            dojoClass.add(icon, "glyphicon glyphicon-search");
            domContainer.appendChild(icon);

            return domContainer;
        },

        _getXPathSearchString: function(searchObj) {
            var cleanSearchValue = searchObj.node.value.replace(/'/g, "");

            switch (searchObj.searchType) {
                case "contains": //fall-through intentional
                case "starts-with":
                    return searchObj.searchType + "(" + searchObj.attr + ",'" + cleanSearchValue + "')";
                case "equals":
                    return "(" + searchObj.attr + "= '" + cleanSearchValue + "')";
                case "boolean":
                    if (searchObj.node.value === "true") {
                        return "(" + searchObj.attr + ")";
                    } else {
                        return "not(" + searchObj.attr + ")";
                    }
                case "date":
                    var theDate = searchObj.widget._getValueAttr();
                    if (!theDate) {
                        return "";
                    }

                    if (!searchObj.localized) {
                        var deLocalizedDate = window.mx.parser.delocalizeEpoch(theDate);
                        theDate = new Date(deLocalizedDate);
                    }

                    var today = theDate.getTime();
                    var tomorrow = theDate.getTime() + this._MS_IN_DAY;
                    var queryString = "(";


                    queryString += searchObj.attr + ">=" + today;
                    queryString += " and ";
                    queryString += searchObj.attr + "<" + tomorrow;

                    queryString += ")"
                    return queryString;
                default:
                    return "";
            }
        },

        _getXPathSearchConstraint: function() {
            var searchParams = [],
                searchBoxes = this._searchBoxes;

            for (var i = 0, sBox; sBox = searchBoxes[i]; ++i) {
                if (sBox.node.value !== "") {
                    var searchString = this._getXPathSearchString(sBox);
                    if (searchString !== "") {
                        searchParams.push(searchString);
                    }
                }
            }

            if (searchParams.length > 0) {
                return "[" + searchParams.join(" and ") + "]";
            } else
                return "";
        },
        _buildMicroflowSearchFunction: function(searchObj) {
            var cleanSearchValue = searchObj.node.value.replace(/'/g, "").toLowerCase();
            var searchAttr = searchObj.attr;

            switch (searchObj.searchType) {
                case "contains":
                    return function(rowObj) {
                        return rowObj.get(searchAttr).toString().toLowerCase().indexOf(cleanSearchValue) !== -1;
                    }
                case "starts-with":
                    return function(rowObj) {
                        return rowObj.get(searchAttr).toString().toLowerCase().indexOf(cleanSearchValue) === 0;
                    }
                case "equals":
                    return function(rowObj) {
                        return rowObj.get(searchAttr).toString().toLowerCase() === cleanSearchValue;
                    }
                case "boolean":
                    return function(rowObj) {
                        return rowObj.get(searchAttr).toString() === searchObj.node.value;
                    }
                case "date":
                    var theDate = searchObj.widget._getValueAttr();
                    if (!theDate) {
                        return null;
                    }

                    if (!searchObj.localized) {
                        var deLocalizedDate = window.mx.parser.delocalizeEpoch(theDate);
                        theDate = new Date(deLocalizedDate);
                    }

                    var today = theDate.getTime();
                    var tomorrow = theDate.getTime() + this._MS_IN_DAY;

                    return function(rowObj) {
                        return rowObj.get(searchAttr) >= today && rowObj.get(searchAttr) < tomorrow;
                    }
                default:
                    return null;
            }
        },
        buildMicroflowFilter: function() {
            var datasource = this._grid._dataSource;
            var searchBoxes = this._searchBoxes;
            var columnFilterFunctions = [];

            for (var i = 0, sBox; sBox = searchBoxes[i]; ++i) {
                if (sBox.node.value !== "") {
                    var filterFunction = this._buildMicroflowSearchFunction(sBox);
                    if (filterFunction) {
                        columnFilterFunctions.push(filterFunction);
                    }
                }
            }

            datasource._filter = function(rowObj) {

                for (var i = 0, colFunc; colFunc = columnFilterFunctions[i]; ++i) {
                    if (!colFunc(rowObj)) {
                        return false;
                    }
                }

                return true;
            };
        },
        _doSearch: function() {
            var grid = this._grid,
                datasource = grid._dataSource,
                self = this;

            clearTimeout(this._searchTimeout);

            if (this._dataType === 'xpath') {
                this._searchTimeout = setTimeout(function() {
                    datasource.setConstraints(self._getXPathSearchConstraint());
                    datasource.reload();
                    grid.reload();
                }, 500);
            } else if (this._dataType === 'local') {
                if (!datasource._holdObjs) {
                    datasource._holdObjs = datasource._allObjects || datasource._allObjs;
                }

                this._searchTimeout = setTimeout(function() {
                    self.buildMicroflowFilter();
                    datasource._allObjects = datasource._holdObjs.filter(datasource._filter);
                    datasource._updateClientPaging(datasource._allObjects);
                    grid.fillGrid();
                }, 500);
            }
        },
        _ignore: function(e) {
            e.stopPropagation();
        },
        _escapeReset: function(e) {
            if (e.keyCode == 27) { // escape key maps to keycode `27`
                for (var i = 0; i < this._searchBoxes.length; i++) {
                    var element = this._searchBoxes[i].node;
                    if (element.tagName === "SELECT") {
                        element.selectedIndex = 0;
                    } else if (element.tagName === "INPUT") {
                        element.value = "";
                    }
                    this._doSearch();
                }
            }
        }
    });
});

require(["DataGridColumnSearch/widget/DataGridColumnSearch"]);
