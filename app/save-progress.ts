// A completed older queued save cannot mark newer edits as saved.
export class SaveProgress {
  private generation=0;
  pending=false;
  start(){this.pending=true;return ++this.generation;}
  finish(generation:number){if(generation!==this.generation)return false;this.pending=false;return true;}
}
