import { readDataFileJson } from '../../../common/utilities/common.util';

const ID_FOLDER_OPEN_FILE_MGMT = 'folderOpenFileMgmt';
const ID_CONTAINER_FILE_MGMT = 'containerFileMgmt';
const ID_OPTION_FILE_TYPE_INPUT = 'optionFileTypeInput';
const ID_INPUT_FILE_DATA = 'inputFileData';
const GROUP_OPTION_MODE_GRAPH = 'input:radio[name=graphMode]';
const ID_OUTPUT_FILE_NAME = 'outputFileName';
const ID_BUTTON_DOWNLOAD_FILE = 'btnDownloadFile';
const ID_BUTTON_LOAD = 'btnLoad';

class FileMgmt {
	constructor(props) {
		this.parent = props.parent;
		this.initButtonEvent();
	}

	initButtonEvent() {
		$(`#${ID_FOLDER_OPEN_FILE_MGMT}`).click(() => {
			$(`#${ID_CONTAINER_FILE_MGMT}`).slideToggle();
		})

		$(`#${ID_OPTION_FILE_TYPE_INPUT}`).change(event => {
			$(`#${ID_INPUT_FILE_DATA}`).val('');
		})

		// Handle event change value on group radio Mode
		$(GROUP_OPTION_MODE_GRAPH).change((event) => {
			const modeGraph = event.target.value;
			this.parent.setGraphMode(modeGraph);
		})

		// Handle event click on button Download
		$(`#${ID_BUTTON_DOWNLOAD_FILE}`).click((event) => {
			const fileName = $(`#${ID_OUTPUT_FILE_NAME}`).val();
			this.parent.save(fileName);
		})

		// Handle event press enter on input file name
		$(`#${ID_OUTPUT_FILE_NAME}`).keypress((event) => {
			if (event.keyCode == 13) {
				const fileName = $(`#${ID_OUTPUT_FILE_NAME}`).val();
				this.parent.save(fileName);
				event.preventDefault();
			}
		})

		$(`#${ID_BUTTON_LOAD}`).click(()=>{
			this.readJsonFile();
		});
	}

	/**
   * Read content file Vertex Type Definition
   * or  read content file Graph Data Structure
   * @param event
   */
	async readJsonFile() {
		const file = $(`#${ID_INPUT_FILE_DATA}`)[0].files[0];
		if (!file)
			return;

		const data = await readDataFileJson(file);
		if (!data)
			return;

    this.parent.cltGraph.loadGraphData(data, file.name);
	}

	clearInputFile() {
		$(`#${ID_INPUT_FILE_DATA}`).val(null);
	}

	clearOutFileName() {
		$(`#${ID_OUTPUT_FILE_NAME}`).val(null);
	}
}

export default FileMgmt;
