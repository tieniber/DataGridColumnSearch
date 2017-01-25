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

			var gridNode = dojoQuery(".mx-name-" + this.targetGridName)[0];
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
					this._addStringSearchBox(i, "contains");
				} else if (renderType === "Integer" || renderType === "Long") {
					this._addStringSearchBox(i, "starts-with");
				} else if (renderType == "Enum") {
					this._addEnumSearchBox(i);
				} else if (renderType == "Boolean") {
					this._addBooleanSearchBox(i);
				}
			}
		},
		_addStringSearchBox: function(i, searchType) {
			var searchNode = dojoConstruct.create("input");
			var searchAttr = this._grid._visibleColumns[i].attrs[0];
			var searchObj = {"attr": searchAttr, "node": searchNode, "searchType": searchType};

			searchNode.type = "search";
			searchNode.placeholder = "(filter)";
			dojoClass.add(searchNode, "form-control");
			dojoClass.add(searchNode, "dataGridSearchField");

			this._grid._gridColumnNodes[i].appendChild(searchNode);
			this._searchBoxes.push(searchObj);

			this.connect(searchNode, "keyup", "_doSearch");
			this.connect(searchNode, "click", "_ignore");
			this.connect(searchNode, "keypress", "_ignore");
		},
		_addEnumSearchBox: function(i) {
			var searchNode = dojoConstruct.create("select");
			var searchAttr = this._grid._visibleColumns[i].attrs[0];
			var searchObj = {
				  "attr": searchAttr
				, "node": searchNode
				, "searchType": "equals"
			};

			var enumMap = mx.metadata.getEntity(this.gridEntity).getEnumMap(searchAttr);

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

			//searchNode.type = "search";
			//searchNode.placeholder = "(filter)";
			dojoClass.add(searchNode, "form-control");
			dojoClass.add(searchNode, "dataGridSearchField");

			this._grid._gridColumnNodes[i].appendChild(searchNode);
			this._searchBoxes.push(searchObj);

			this.connect(searchNode, "onchange", "_doSearch");
			this.connect(searchNode, "click", "_ignore");
			this.connect(searchNode, "keypress", "_ignore");
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

			this._grid._gridColumnNodes[i].appendChild(searchNode);
			this._searchBoxes.push(searchObj);

			this.connect(searchNode, "onchange", "_doSearch");
			this.connect(searchNode, "click", "_ignore");
			this.connect(searchNode, "keypress", "_ignore");
		},
		_getSearchString: function(searchObj) {
			if (searchObj.searchType === "contains" || searchObj.searchType === "starts-with") {
				return searchObj.searchType + "(" + searchObj.attr + ",'" + searchObj.node.value + "')";
			} else if (searchObj.searchType === "equals") {
				return "(" + searchObj.attr + "= '" + searchObj.node.value + "')";
			} else if (searchObj.searchType === "boolean") {
				if (searchObj.node.value === "true") {
					return "(" + searchObj.attr + ")";
				} else {
					return "not(" + searchObj.attr + ")";
				}
			} else return "";
		},
		_getSearchConstraint: function() {
	        var searchParams = []
	          , searchBoxes = this._searchBoxes;

            for (var i = 0, sBox; sBox = searchBoxes[i]; ++i) {
				if(sBox.node.value !== "") {
					searchParams.push(this._getSearchString(sBox));
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
		}
    });
});

require(["DataGridColumnSearch/widget/DataGridColumnSearch"]);
