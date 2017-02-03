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


], function (declare, _WidgetBase, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent, dojoQuery) {
    "use strict";

    return declare("DataGridColumnSearch.widget.DataGridColumnSearch", [ _WidgetBase ], {


        // Internal variables.
        _handles: null,
        _contextObj: null,
		_searchBoxes:null,

        constructor: function () {
            this._handles = [];
			this._searchBoxes = [];
        },

        postCreate: function () {
            logger.debug(this.id + ".postCreate");
        },

        update: function (obj, callback) {
            logger.debug(this.id + ".update");

            this._contextObj = obj;
            this._updateRendering(callback);
        },

        resize: function (box) {
          logger.debug(this.id + ".resize");
        },

        uninitialize: function () {
          logger.debug(this.id + ".uninitialize");
        },

        _updateRendering: function (callback) {
            logger.debug(this.id + "._updateRendering");

			var gridNode = dojoQuery(".mx-name-" + this.targetGridName, this.domNode.parentNode)[0];
			if (gridNode) {
				this._grid = dijit.registry.byNode(gridNode);
				if (this._grid) {
					this._addSearchBoxes();
				} else {
					console.log("Found a DOM node but could not find the grid widget.");
				}
			} else {
				console.log("Could not find the list view node.");
			}

            mendix.lang.nullExec(callback);
        },
		_addSearchBoxes: function() {
			for (var i = 0; i < this._grid._gridColumnNodes.length; i++ ) {
				var renderType = this._grid._visibleColumns[i].render
				if (renderType === "String") {
					this._addStringSearchBox(i, "contains", "search");
				} else if (renderType === "Integer" || renderType === "Long") {
					this._addStringSearchBox(i, "starts-with", "search");
				} else if (renderType == "Date") {
					var format = this._grid._visibleColumns[i].display.format;
					this._addDateSearchBox(i, format);
				} else if (renderType == "Enum") {
					this._addEnumSearchBox(i);
				} else if (renderType == "Boolean") {
					this._addBooleanSearchBox(i);
				}
			}
		},
		_addStringSearchBox: function(i, searchType, inputType) {
			var searchNode = dojoConstruct.create("input");
			var searchAttr = this._grid._visibleColumns[i].attrs[0];
			var searchObj = {"attr": searchAttr, "node": searchNode, "searchType": searchType};

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
			this.connect(searchNode, "keypress", "_escapeReset");
		},
		_addDateSearchBox: function(i, format) {
			var datePicker = mxui.widget.DatePicker(
				{
					"format": format,
					"placeholder": format
				});

			datePicker.buildRendering();
			datePicker.startup();

			var searchNode = datePicker.domNode.children[1].children[0];
			var searchAttr = this._grid._visibleColumns[i].attrs[0];
			var searchObj = {"attr": searchAttr, "node": searchNode, "searchType": "date", "widget": datePicker};

			var DOMContainer = this._buildDOMContainer();
			this._grid._gridColumnNodes[i].appendChild(DOMContainer);

			dojoClass.add(searchNode, "dataGridSearchField");

			DOMContainer.appendChild(datePicker.domNode);
			this._searchBoxes.push(searchObj);

			this.connect(searchNode, "keyup", "_doSearch");
			this.connect(searchNode, "click", "_ignore");
			this.connect(searchNode, "keypress", "_ignore");
			this.connect(searchNode, "keypress", "_escapeReset");
			this.connect(datePicker, "onChange", "_doSearch");
		},
		_addEnumSearchBox: function(i) {
			var searchNode = dojoConstruct.create("select");
			var searchAttr = this._grid._visibleColumns[i].attrs[0];
			var searchObj = {
				  "attr": searchAttr
				, "node": searchNode
				, "searchType": "equals"
			};

			var enumMap;
			if (mx.meta) {
				enumMap = mx.meta.getEntity(this.gridEntity).getEnumMap(searchAttr); //used in 6.10.3
			} else {
				enumMap = mx.metadata.getEntity(this.gridEntity).getEnumMap(searchAttr); //used in 5.20
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
			this.connect(searchNode, "keypress", "_escapeReset");
		},
		_addBooleanSearchBox: function(i) {
			var searchNode = dojoConstruct.create("select");
			var searchAttr = this._grid._visibleColumns[i].attrs[0];
			var searchObj = {
				  "attr": searchAttr
				, "node": searchNode
				, "searchType": "boolean"
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

		_getSearchString: function(searchObj) {
			switch (searchObj.searchType) {
				case "contains":
				case "starts-with":
					return searchObj.searchType + "(" + searchObj.attr + ",'" + searchObj.node.value + "')";
				case "equals":
					return "(" + searchObj.attr + "= '" + searchObj.node.value + "')";
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
					var year = theDate.getFullYear();
					var month = theDate.getMonth()+1;
					var day = theDate.getDate();
					var queryString = "(";
					queryString += "year-from-dateTime(" +searchObj.attr + ") = " +  year;
					queryString += " and month-from-dateTime(" +searchObj.attr + ") = " +  month;
					queryString += " and day-from-dateTime(" +searchObj.attr + ") = " +  day;
					queryString += ")"
					return queryString;
				default:
					return "";
			}
		},
		_getSearchConstraint: function() {
	        var searchParams = []
	          , searchBoxes = this._searchBoxes;

            for (var i = 0, sBox; sBox = searchBoxes[i]; ++i) {
				if(sBox.node.value !== "") {
					var searchString = this._getSearchString(sBox);
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
		_doSearch: function () {
			var grid = this._grid
			  , datasource = grid._datasource
			  , self= this;

			if (!datasource) {
				 datasource = grid._dataSource;
			}
			clearTimeout(this._searchTimeout);
			this._searchTimeout = setTimeout(function() {
				datasource.setConstraints(self._getSearchConstraint());
				grid.reload();
			}, 500);
		},
		_ignore: function(e) {
			e.stopPropagation();
		},
		_escapeReset: function(e) {
			if (e.keyCode == 27) { // escape key maps to keycode `27`
	        	for (var i=0; i<this._searchBoxes.length; i++) {
					var element = this._searchBoxes[i].node;
					if (element.tagName === "SELECT"){
						element.selectedIndex = 0;
					} else if (element.tagName === "INPUT"){
						element.value = "";
					}
					this._doSearch();
				}
    		}
		}
    });
});

require(["DataGridColumnSearch/widget/DataGridColumnSearch"]);
